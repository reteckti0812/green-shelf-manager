import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import CadastroItens from "./pages/CadastroItens";
import LotesPausados from "./pages/LotesPausados";
import LotesSemLocalizacao from "./pages/LotesSemLocalizacao";
import FinalizarLote from "./pages/FinalizarLote";
import MapaPage from "./pages/MapaPage";
import Dashboard from "./pages/admin/Dashboard";
import TempoReal from "./pages/admin/TempoReal";
import ProdutosAdmin from "./pages/admin/ProdutosAdmin";
import DefeitosAdmin from "./pages/admin/DefeitosAdmin";
import LegendasAdmin from "./pages/admin/LegendasAdmin";
import UsuariosAdmin from "./pages/admin/UsuariosAdmin";
import AuditoriaAdmin from "./pages/admin/AuditoriaAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Protected = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => (
  <ProtectedRoute adminOnly={adminOnly}>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Protected><Index /></Protected>} />
            <Route path="/lote/:id" element={<Protected><CadastroItens /></Protected>} />
            <Route path="/lotes-pausados" element={<Protected><LotesPausados /></Protected>} />
            <Route path="/lotes-sem-localizacao" element={<Protected><LotesSemLocalizacao /></Protected>} />
            <Route path="/finalizar/:id" element={<Protected><FinalizarLote /></Protected>} />
            <Route path="/mapa" element={<Protected><MapaPage /></Protected>} />
            <Route path="/admin/dashboard" element={<Protected adminOnly><Dashboard /></Protected>} />
            <Route path="/admin/tempo-real" element={<Protected adminOnly><TempoReal /></Protected>} />
            <Route path="/admin/produtos" element={<Protected adminOnly><ProdutosAdmin /></Protected>} />
            <Route path="/admin/defeitos" element={<Protected adminOnly><DefeitosAdmin /></Protected>} />
            <Route path="/admin/legendas" element={<Protected adminOnly><LegendasAdmin /></Protected>} />
            <Route path="/admin/usuarios" element={<Protected adminOnly><UsuariosAdmin /></Protected>} />
            <Route path="/admin/auditoria" element={<Protected adminOnly><AuditoriaAdmin /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
