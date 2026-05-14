const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "0.0.0";

export default function AppFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="max-w-[1400px] mx-auto mb-[60px] mt-10 border- border-gray-200 bg-white py-2 px-6 flex items-center justify-between rounded-sm">
            <span className="text-xs text-muted-foreground select-none">
                © {currentYear} SmartRoofing.Ai. All rights reserved.
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground select-none font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                v{APP_VERSION}
            </span>
        </footer>
    );
}