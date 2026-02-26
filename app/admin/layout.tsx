'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Image as ImageIcon, LogOut, Menu, X, BarChart3, Settings } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // 1. Check if we are on the login page
    const isLoginPage = pathname === '/admin' || pathname === '/admin/';

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAuthenticated(!!user);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isLoginPage) {
            router.push('/admin');
        }
    }, [isLoading, isAuthenticated, isLoginPage, router]);

    // If on the login page, render children directly (Login Form)
    if (isLoginPage) {
        return <>{children}</>;
    }

    // Checking auth status... show nothing or a spinner
    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>;
    }

    // If not authenticated (and not on login page), we already redirected.
    // But to be safe/clean while redirecting:
    if (!isAuthenticated) {
        return null;
    }

    const handleLogout = async () => {
        await signOut(auth);
        localStorage.removeItem('isAdmin');
        router.push('/admin/');
    };

    const navItems = [
        { name: 'プロジェクト管理', href: '/admin/dashboard/', icon: LayoutDashboard },
        { name: 'ポートフォリオ管理', href: '/admin/portfolio/', icon: ImageIcon },
        { name: 'スライドショー管理', href: '/admin/slides/', icon: ImageIcon },
        { name: 'アクセス解析', href: '/admin/analytics/', icon: BarChart3 },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-gray-900 text-white min-h-screen fixed left-0 top-0 z-50">
                <div className="p-6 border-b border-gray-800">
                    <h1 className="text-xl font-bold tracking-tight text-white">Admin Console</h1>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin/dashboard/' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        ログアウト
                    </button>
                    <div className="mt-4 px-4 text-xs text-gray-600">
                        v0.1.0
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-gray-900 text-white z-50 flex justify-between items-center p-4">
                <span className="font-bold">Admin Console</span>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 bg-gray-900 z-40 pt-20 px-6 space-y-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block py-3 text-lg font-medium text-gray-300 hover:text-white border-b border-gray-800"
                        >
                            <span className="flex items-center gap-3">
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </span>
                        </Link>
                    ))}
                    <button
                        onClick={handleLogout}
                        className="w-full text-left py-3 text-lg font-medium text-red-400 border-b border-gray-800 flex items-center gap-3"
                    >
                        <LogOut className="h-5 w-5" />
                        ログアウト
                    </button>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 md:ml-64 w-full">
                {/* Spacer for mobile header */}<div className="h-16 md:hidden" />
                {children}
            </div>
        </div>
    );
}
