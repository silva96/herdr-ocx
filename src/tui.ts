import { Plugin } from "@opencode/plugin/tui"
import { execFile } from "node:child_process"
import net from "node:net"

const source = "herdr:ocx"

function compatibleServer(binary: string) {
  return new Promise<boolean>((resolve) => {
    execFile(binary, ["status", "server"], { timeout: 1000 }, (error, stdout) => {
      const version = /^version:\s*(\d+)\.(\d+)\.(\d+)\s*$/m.exec(stdout)
      if (error || !version) return resolve(false)
      const [major, minor, patch] = version.slice(1).map(Number)
      resolve(major > 0 || minor > 9 || (minor === 9 && patch >= 2))
    })
  })
}

function report(socketPath: string, params: Record<string, unknown>, method = "pane.report_agent") {
  return new Promise<boolean>((resolve) => {
    let response = ""
    let settled = false
    const client = net.createConnection(socketPath, () => {
      client.write(JSON.stringify({ id: `${source}:${params.seq}`, method, params }) + "\n")
    })
    const finish = (accepted: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      client.destroy()
      resolve(accepted)
    }
    const timeout = setTimeout(() => finish(false), 500)
    timeout.unref()
    client.setEncoding("utf8")
    client.on("error", () => finish(false))
    client.on("end", () => finish(false))
    client.on("data", (chunk) => {
      response += chunk
      if (!response.includes("\n")) return
      try {
        finish(!JSON.parse(response.split("\n")[0]).error)
      } catch {
        finish(false)
      }
    })
  })
}

export default Plugin.define({
  id: "herdr-ocx.tui",
  async setup(ctx) {
    const profile = process.env.OCX_PROFILE
    const pane = process.env.HERDR_PANE_ID
    const socket = process.env.HERDR_SOCKET_PATH
    const binary = process.env.HERDR_BIN_PATH
    if (process.env.HERDR_ENV !== "1" || !profile || !pane || !socket || !binary) return
    if (!await compatibleServer(binary)) return

    const database = process.env.OPENCODE_DB
    let sequence = Date.now() * 1000
    // null keeps a deleted selection's release retryable until it is accepted.
    let selected: string | null | undefined
    let lastReport: string | undefined
    let pending = false
    let disposed = false
    let retryAt = 0
    let retryDelay = 250
    const failed = new Set<string>()

    async function sync() {
      if (disposed || pending || Date.now() < retryAt) return
      const route = ctx.ui.router.current()
      if (route.type === "session") {
        const session = ctx.data.session.root(route.sessionID)
        if (session && ctx.data.session.get(session)) selected = session
      }
      if (selected === undefined) return
      if (selected && !ctx.data.session.get(selected)) selected = null

      const family = new Set(selected ? [selected, ...ctx.data.session.family(selected)] : [])
      let state = "idle"
      if (selected && route.type === "session") {
        if ([...family].some((id) => ctx.data.session.status(id) === "running")) state = "working"
        if (failed.has(selected) || [...family].some((id) =>
          ctx.data.session.permission.list(id)?.length || ctx.data.session.form.list(id)?.length
        )) state = "blocked"
      }
      const key = selected ? `${selected}:${state}` : "released"
      if (key === lastReport) return

      const launcher = ["ocx", "oc", "--profile", profile, "--session", selected]
      pending = true
      try {
        const accepted = await report(socket, {
          pane_id: pane,
          source,
          agent: "opencode",
          seq: ++sequence,
          ...(selected ? {
            state,
            agent_session_id: selected,
            resume_argv: database ? ["env", `OPENCODE_DB=${database}`, ...launcher] : launcher,
          } : {}),
        }, selected ? "pane.report_agent" : "pane.release_agent")
        if (accepted) {
          lastReport = key
          retryAt = 0
          retryDelay = 250
        } else {
          retryAt = Date.now() + retryDelay
          retryDelay = Math.min(retryDelay * 2, 5000)
        }
      } finally {
        pending = false
      }
    }

    const unsubscribe = ctx.data.listen(({ details: event }) => {
      switch (event.type) {
        case "session.execution.failed":
          failed.add(event.data.sessionID)
          break
        case "session.execution.started":
        case "session.execution.succeeded":
        case "session.execution.interrupted":
        case "session.deleted":
          failed.delete(event.data.sessionID)
          if (event.type === "session.deleted" && event.data.sessionID === selected) selected = null
          break
      }
      void sync()
    })
    const poll = setInterval(() => void sync(), 250)
    void sync()
    return () => {
      disposed = true
      clearInterval(poll)
      unsubscribe()
    }
  },
})
