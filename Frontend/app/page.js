import App from "@/components/App";

// The app is a single-page, client-side state machine (landing → assessment →
// result). It lives entirely inside <App/>, a client component, so this route
// stays a thin server component (good for SSR/SEO of the landing markup).
export default function Page() {
  return <App />;
}
