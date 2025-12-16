import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

export function ThemeToggle() {
  const { darkMode, setDarkMode } = useAppStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDarkMode(!darkMode)}
      data-testid="button-theme-toggle"
    >
      {darkMode ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
