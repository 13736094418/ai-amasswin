export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return new Response('Hello from AI.AMASSWIN.COM API!', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}