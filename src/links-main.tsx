import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LinksPage from "./pages/LinksPage";
import FacebookPixel from "@/components/FacebookPixel";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const LinksApp = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FacebookPixel />
        <LinksPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById("root")!).render(<LinksApp />);
