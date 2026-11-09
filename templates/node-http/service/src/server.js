import http from 'node:http';
export function createServer(buildCommit = process.env.BUILD_COMMIT || 'development') {
  return http.createServer((request, response) => {
    const routes = {'/healthz': {status: 'ok'}, '/version': {name: 'independent-node', buildCommit},
      '/': {message: 'Hello from the independent consumer'}};
    const body = request.method === 'GET' ? routes[request.url] : undefined;
    response.writeHead(body ? 200 : 404, {'content-type': 'application/json'});
    response.end(JSON.stringify(body || {error: 'Not found'}));
  });
}
