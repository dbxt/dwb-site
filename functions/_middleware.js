export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname.toLowerCase() === 'www.davidwaynebaxter.com') {
    url.hostname = 'davidwaynebaxter.com';
    return Response.redirect(url, 301);
  }

  return context.next();
}
