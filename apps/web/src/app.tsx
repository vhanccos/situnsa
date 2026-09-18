import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  redirect,
} from "@tanstack/react-router";
import { redirigirSiNoPuede, rolGuardado } from "./api/guard.js";
import { SessionProvider } from "./api/session.js";
import { ToastProvider } from "./components/ui/toast.js";
import { AdminPage } from "./routes/admin.js";
import { AsesorPage } from "./routes/asesor.js";
import { ExpedienteDetallePage } from "./routes/expedientes.$id.js";
import { NuevoExpedientePage } from "./routes/expedientes-nuevo.js";
import { HomePage } from "./routes/index.js";
import { InscripcionesPage } from "./routes/inscripciones.js";
import { LoginPage } from "./routes/login.js";
import { MiTramitePage } from "./routes/mi-tramite.js";
import { AsesoresPage, TalleresPage } from "./routes/talleres-asesores.js";

const rootRoute = createRootRoute();

/** Guard de rol solo-UI (el servidor revalida): redirige según matriz. */
function guard(path: string) {
  return () => {
    const destino = redirigirSiNoPuede(rolGuardado(), path);
    if (destino) throw redirect({ to: destino });
  };
}
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomePage });
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: guard("/admin"),
  component: AdminPage,
});
const miTramiteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mi-tramite",
  beforeLoad: guard("/mi-tramite"),
  component: MiTramitePage,
});
const asesorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/asesor",
  beforeLoad: guard("/asesor"),
  component: AsesorPage,
});
const nuevoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/expedientes/nuevo",
  beforeLoad: guard("/expedientes/nuevo"),
  component: NuevoExpedientePage,
});
const detalleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/expedientes/$id",
  beforeLoad: guard("/expedientes/x"),
  component: ExpedienteDetallePage,
});
const inscripcionesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inscripciones",
  beforeLoad: guard("/inscripciones"),
  component: InscripcionesPage,
});
const talleresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/talleres",
  beforeLoad: guard("/talleres"),
  component: TalleresPage,
});
const asesoresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/asesores",
  beforeLoad: guard("/asesores"),
  component: AsesoresPage,
});
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  adminRoute,
  miTramiteRoute,
  asesorRoute,
  nuevoRoute,
  detalleRoute,
  inscripcionesRoute,
  talleresRoute,
  asesoresRoute,
]);

const router = createRouter({ routeTree });
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient();

export function App() {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
