import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar imediatamente para login por segurança
    // Não expor estrutura do sistema em página 404
    navigate("/auth", { replace: true });
  }, [navigate]);

  return null; // Não renderizar nada, apenas redirecionar
};

export default NotFound;
