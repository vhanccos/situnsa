import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { ExpedienteDetallePage } from "./routes/expedientes.$id.js";
import { HomePage } from "./routes/index.js";
import { LoginPage } from "./routes/login.js";

const rootRoute = createRootRoute();
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomePage });
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});
const detalleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/expedientes/$id",
  component: ExpedienteDetallePage,
});
const routeTree = rootRoute.addChildren([indexRoute, loginRoute, detalleRoute]);

const router = createRouter({ routeTree });
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
