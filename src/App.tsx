import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RoleRoute } from "@/components/layout/RoleRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Agenda from "./pages/Agenda";
import ConsultaMedica from "./pages/ConsultaMedica";
import Clientes from "./pages/Clientes";
import Vendas from "./pages/Vendas";
import Relatorios from "./pages/Relatorios";
import Servicos from "./pages/Servicos";
import Produtos from "./pages/Produtos";
import Configuracoes from "./pages/Configuracoes";
import Planos from "./pages/Planos";
import NaoAutorizado from "./pages/NaoAutorizado";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/nao-autorizado" element={<ProtectedRoute><NaoAutorizado /></ProtectedRoute>} />

            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
            <Route path="/consulta-medica" element={<RoleRoute allow={["administrador", "atendente", "medico"]}><ConsultaMedica /></RoleRoute>} />

            <Route path="/clientes" element={<RoleRoute allow={["administrador", "atendente"]}><Clientes /></RoleRoute>} />
            <Route path="/vendas" element={<RoleRoute allow={["administrador", "atendente"]}><Vendas /></RoleRoute>} />
            <Route path="/relatorios" element={<RoleRoute allow={["administrador", "atendente"]}><Relatorios /></RoleRoute>} />

            <Route path="/servicos" element={<RoleRoute allow={["administrador"]}><Servicos /></RoleRoute>} />
            <Route path="/produtos" element={<RoleRoute allow={["administrador"]}><Produtos /></RoleRoute>} />
            <Route path="/configuracoes" element={<RoleRoute allow={["administrador"]}><Configuracoes /></RoleRoute>} />
            <Route path="/planos" element={<RoleRoute allow={["administrador"]}><Planos /></RoleRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
