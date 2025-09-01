// src/components/AppLayout.tsx
import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAppContext } from "@/contexts/AppContext";
import { useIsMobile } from "@/hooks/use-mobile";

type AppLayoutProps = {
  /** Nội dung trang */
  children?: React.ReactNode;
  /** Thêm lớp cho wrapper ngoài cùng nếu cần */
  className?: string;
  /** Thêm lớp cho thẻ <main> nếu cần */
  mainClassName?: string;
};

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  className = "",
  mainClassName = "",
}) => {
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const isMobile = useIsMobile();

  return (
    <div
      className={`min-h-screen flex flex-col bg-white ${className} ${
        sidebarOpen && isMobile ? "overflow-hidden" : ""
      }`}
    >
      {/* Skip link for accessibility */}
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-amber-400 focus:px-3 focus:py-1.5 focus:text-black"
      >
        Bỏ qua phần đầu trang
      </a>

      <Header />

      {/* Overlay khi mở sidebar trên mobile (nếu bạn có sidebar trong AppContext) */}
      {sidebarOpen && isMobile && (
        <button
          aria-label="Đóng menu"
          onClick={toggleSidebar}
          className="fixed inset-0 z-40 bg-black/40"
        />
      )}

      <main id="app-main" className={`flex-1 ${mainClassName}`}>
        {children}
      </main>

      <Footer />
    </div>
  );
};

export default AppLayout;
