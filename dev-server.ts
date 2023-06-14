import { serve } from "std/http/server.ts";
import { serveDir } from "std/http/file_server.ts";

const port = 8080;
const fsRoot = "./build/dist";
serve(r => serveDir(r, { fsRoot }), { port });
console.log(`Web server running. Access it at: http://localhost:${port}/`);
