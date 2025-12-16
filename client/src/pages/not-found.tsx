import { Link } from "wouter";
import { Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button data-testid="button-go-home">
          <Home className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </Link>
    </div>
  );
}
