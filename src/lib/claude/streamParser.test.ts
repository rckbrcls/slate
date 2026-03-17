import { describe, it, expect } from "vitest"
import { parseStreamLine } from "./streamParser"

describe("parseStreamLine", () => {
  it("should parse assistant message", () => {
    const event = parseStreamLine('{"type":"assistant","message":{"content":[{"text":"Hello"}]}}')
    expect(event).toEqual({ type: "assistant", message: "Hello" })
  })

  it("should parse content_block_delta", () => {
    const event = parseStreamLine('{"type":"content_block_delta","delta":{"text":"world"}}')
    expect(event).toEqual({ type: "assistant", message: "world" })
  })

  it("should parse tool_use", () => {
    const event = parseStreamLine('{"type":"tool_use","name":"Read","input":{"path":"test.txt"}}')
    expect(event).toEqual({ type: "tool_use", name: "Read", input: { path: "test.txt" } })
  })

  it("should parse tool_result", () => {
    const event = parseStreamLine('{"type":"tool_result","name":"Read","output":"file contents"}')
    expect(event).toEqual({ type: "tool_result", name: "Read", output: "file contents" })
  })

  it("should parse result", () => {
    const event = parseStreamLine('{"type":"result","result":"Done editing","cost_usd":0.05}')
    expect(event).toEqual({ type: "result", text: "Done editing", cost: 0.05 })
  })

  it("should parse error", () => {
    const event = parseStreamLine('{"type":"error","error":{"message":"Something went wrong"}}')
    expect(event).toEqual({ type: "error", message: "Something went wrong" })
  })

  it("should return null for empty lines", () => {
    expect(parseStreamLine("")).toBeNull()
    expect(parseStreamLine("   ")).toBeNull()
  })

  it("should handle malformed JSON gracefully", () => {
    const event = parseStreamLine("not json at all")
    expect(event).toEqual({ type: "system", message: "not json at all" })
  })

  it("should handle unknown event types with message", () => {
    const event = parseStreamLine('{"type":"unknown","message":"info"}')
    expect(event).toEqual({ type: "system", message: "info" })
  })
})
