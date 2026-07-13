// This file is required to prevent Next.js from crashing during static page
// generation with React 19. Without it, Next.js tries to statically render
// the default /_error page which causes a "useRef on null" crash in React 19.
// getInitialProps disables Automatic Static Optimization for this page only.
function Error() {
  return null;
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
