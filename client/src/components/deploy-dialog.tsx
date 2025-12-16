import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Wifi,
  Usb,
  Cloud,
  CheckCircle2,
  XCircle,
  Loader2,
  Radio,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAppStore } from "@/lib/store";
import type { DeploymentMethod, DeploymentStatus } from "@shared/schema";

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

const deploymentMethods = [
  {
    id: "wifi_ota" as DeploymentMethod,
    name: "WiFi OTA",
    description: "Deploy over WiFi using Over-The-Air update",
    icon: Wifi,
  },
  {
    id: "usb_serial" as DeploymentMethod,
    name: "USB Serial",
    description: "Deploy via USB cable connection",
    icon: Usb,
  },
  {
    id: "cloud_ota" as DeploymentMethod,
    name: "Cloud OTA",
    description: "Deploy via cloud relay for remote devices",
    icon: Cloud,
  },
];

function getStatusIcon(status: DeploymentStatus["status"]) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "error":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "idle":
      return <Radio className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
  }
}

function getStatusMessage(status: DeploymentStatus): string {
  switch (status.status) {
    case "idle":
      return "Ready to deploy";
    case "compiling":
      return "Compiling firmware...";
    case "uploading":
      return "Uploading to device...";
    case "verifying":
      return "Verifying upload...";
    case "complete":
      return "Deployment successful!";
    case "error":
      return status.error || "Deployment failed";
    default:
      return status.message || "Processing...";
  }
}

export function DeployDialog({ open, onOpenChange, projectId, projectName }: DeployDialogProps) {
  const [method, setMethod] = useState<DeploymentMethod>("wifi_ota");
  const { deploymentStatus, setDeploymentStatus } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      // Reset status when dialog closes
      setDeploymentStatus({ status: "idle", progress: 0 });
    }
  }, [open, setDeploymentStatus]);

  const deployMutation = useMutation({
    mutationFn: async () => {
      setDeploymentStatus({ status: "compiling", progress: 10, message: "Compiling firmware..." });
      
      // Simulate compilation
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setDeploymentStatus({ status: "compiling", progress: 40, message: "Linking libraries..." });
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setDeploymentStatus({ status: "uploading", progress: 50, message: "Connecting to device..." });
      
      // Simulate upload
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setDeploymentStatus({ status: "uploading", progress: 70, message: "Uploading firmware..." });
      
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setDeploymentStatus({ status: "verifying", progress: 90, message: "Verifying upload..." });
      
      await new Promise((resolve) => setTimeout(resolve, 800));
      setDeploymentStatus({ status: "complete", progress: 100, message: "Deployment complete!" });
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Deployment successful",
        description: "Your firmware has been uploaded to the device.",
      });
    },
    onError: (error) => {
      setDeploymentStatus({
        status: "error",
        progress: 0,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
      toast({
        title: "Deployment failed",
        description: "Failed to deploy firmware. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeploy = () => {
    deployMutation.mutate();
  };

  const isDeploying = ["compiling", "uploading", "verifying"].includes(deploymentStatus.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deploy Firmware</DialogTitle>
          <DialogDescription>
            Deploy "{projectName}" to your device
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Deployment Method</Label>
            <RadioGroup
              value={method}
              onValueChange={(value) => setMethod(value as DeploymentMethod)}
              disabled={isDeploying}
            >
              {deploymentMethods.map((dm) => (
                <div
                  key={dm.id}
                  className={`flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover-elevate ${
                    method === dm.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => !isDeploying && setMethod(dm.id)}
                  data-testid={`radio-deploy-${dm.id}`}
                >
                  <RadioGroupItem value={dm.id} id={dm.id} />
                  <dm.icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor={dm.id} className="font-medium cursor-pointer">
                      {dm.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">{dm.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {(isDeploying || deploymentStatus.status === "complete" || deploymentStatus.status === "error") && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(deploymentStatus.status)}
                <span className="text-sm font-medium">
                  {getStatusMessage(deploymentStatus)}
                </span>
              </div>
              {isDeploying && (
                <Progress value={deploymentStatus.progress} className="h-2" />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeploying}
          >
            {deploymentStatus.status === "complete" ? "Close" : "Cancel"}
          </Button>
          {deploymentStatus.status !== "complete" && (
            <Button
              onClick={handleDeploy}
              disabled={isDeploying}
              data-testid="button-start-deploy"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                "Deploy"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
