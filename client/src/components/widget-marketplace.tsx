import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Store,
  Search,
  Download,
  Star,
  ExternalLink,
  Package,
  Zap,
  Cloud,
  Cpu,
  Thermometer,
  Activity,
  Gauge,
  BarChart3,
  TrendingUp,
  Globe,
  Wifi,
  Database,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import WidgetIntegrationService from "@/services/widget-integration";
import type { WidgetType } from "@shared/schema";

interface ExternalWidget {
  id: string;
  name: string;
  description: string;
  type: WidgetType;
  source: 'thingsboard' | 'node-red' | 'grafana' | 'freeboard' | 'community';
  version: string;
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  screenshots: string[];
  config: any;
  installed: boolean;
  compatible: boolean;
}

interface WidgetMarketplaceProps {
  onInstallWidget: (widget: ExternalWidget) => void;
}

export function WidgetMarketplace({ onInstallWidget }: WidgetMarketplaceProps) {
  const [widgets, setWidgets] = useState<ExternalWidget[]>([]);
  const [filteredWidgets, setFilteredWidgets] = useState<ExternalWidget[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [installingWidgets, setInstallingWidgets] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const widgetService = new WidgetIntegrationService();

  // Mock data for demonstration
  const mockWidgets: ExternalWidget[] = [
    {
      id: "tb-timeseries-chart",
      name: "Advanced Timeseries Chart",
      description: "Professional time-series visualization with multiple data sources and advanced analytics",
      type: "lineChart",
      source: "thingsboard",
      version: "3.4.2",
      author: "ThingsBoard Team",
      downloads: 15420,
      rating: 4.8,
      tags: ["timeseries", "analytics", "professional"],
      screenshots: ["/api/placeholder/400/300"],
      config: { dataKeys: [], settings: {} },
      installed: false,
      compatible: true
    },
    {
      id: "nr-dashboard-gauge",
      name: "Animated Gauge Widget",
      description: "Beautiful animated gauge with customizable ranges and smooth transitions",
      type: "gauge",
      source: "node-red",
      version: "2.1.0",
      author: "Node-RED Community",
      downloads: 8930,
      rating: 4.6,
      tags: ["gauge", "animation", "dashboard"],
      screenshots: ["/api/placeholder/400/300"],
      config: { min: 0, max: 100, segments: 3 },
      installed: false,
      compatible: true
    },
    {
      id: "grafana-stat-panel",
      name: "Enhanced Stat Panel",
      description: "Advanced statistics panel with trend indicators and threshold alerts",
      type: "valueDisplay",
      source: "grafana",
      version: "9.2.1",
      author: "Grafana Labs",
      downloads: 23150,
      rating: 4.9,
      tags: ["statistics", "alerts", "monitoring"],
      screenshots: ["/api/placeholder/400/300"],
      config: { thresholds: [], sparkline: true },
      installed: true,
      compatible: true
    },
    {
      id: "community-heatmap",
      name: "Interactive Heatmap",
      description: "Customizable heatmap with zoom, pan, and data drill-down capabilities",
      type: "heatmap",
      source: "community",
      version: "1.3.0",
      author: "µCodeLab Community",
      downloads: 2340,
      rating: 4.4,
      tags: ["heatmap", "interactive", "visualization"],
      screenshots: ["/api/placeholder/400/300"],
      config: { colorScheme: "viridis", interactive: true },
      installed: false,
      compatible: true
    },
    {
      id: "freeboard-led-array",
      name: "LED Array Display",
      description: "Matrix LED display widget for showing patterns and animations",
      type: "ledIndicator",
      source: "freeboard",
      version: "1.0.5",
      author: "Freeboard Contributors",
      downloads: 1820,
      rating: 4.2,
      tags: ["led", "matrix", "display"],
      screenshots: ["/api/placeholder/400/300"],
      config: { rows: 8, cols: 8, brightness: 100 },
      installed: false,
      compatible: false
    }
  ];

  const sources = [
    { id: "all", name: "All Sources", icon: Store },
    { id: "thingsboard", name: "ThingsBoard", icon: Database },
    { id: "node-red", name: "Node-RED", icon: Cpu },
    { id: "grafana", name: "Grafana", icon: BarChart3 },
    { id: "freeboard", name: "Freeboard", icon: Activity },
    { id: "community", name: "Community", icon: Globe }
  ];

  const categories = [
    { id: "all", name: "All Categories" },
    { id: "control", name: "Control Widgets" },
    { id: "display", name: "Display Widgets" },
    { id: "visualization", name: "Visualization" },
    { id: "media", name: "Media Widgets" },
    { id: "layout", name: "Layout Widgets" }
  ];

  useEffect(() => {
    loadWidgets();
  }, []);

  useEffect(() => {
    filterWidgets();
  }, [widgets, searchQuery, selectedSource, selectedCategory]);

  const loadWidgets = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from multiple sources
      // For now, we'll use mock data
      setWidgets(mockWidgets);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load widgets from marketplace",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterWidgets = () => {
    let filtered = widgets;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(widget =>
        widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        widget.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        widget.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by source
    if (selectedSource !== "all") {
      filtered = filtered.filter(widget => widget.source === selectedSource);
    }

    // Filter by category (based on widget type)
    if (selectedCategory !== "all") {
      const categoryTypes: Record<string, WidgetType[]> = {
        control: ["button", "slider", "toggle", "joystick", "dropdown", "colorPicker"],
        display: ["gauge", "valueDisplay", "ledIndicator", "textDisplay", "progressBar"],
        visualization: ["lineChart", "barChart", "scatterPlot", "heatmap", "3dModel"],
        media: ["videoStream", "imageDisplay", "audioPlayer"],
        layout: ["container", "tabs", "accordion"]
      };
      
      const allowedTypes = categoryTypes[selectedCategory] || [];
      filtered = filtered.filter(widget => allowedTypes.includes(widget.type));
    }

    setFilteredWidgets(filtered);
  };

  const handleInstallWidget = async (widget: ExternalWidget) => {
    if (widget.installed) {
      toast({
        title: "Already Installed",
        description: `${widget.name} is already installed`,
        variant: "default"
      });
      return;
    }

    if (!widget.compatible) {
      toast({
        title: "Incompatible Widget",
        description: `${widget.name} is not compatible with this version of µCodeLab`,
        variant: "destructive"
      });
      return;
    }

    setInstallingWidgets(prev => new Set(prev).add(widget.id));

    try {
      // Convert and install widget
      const convertedWidget = await widgetService.convertWidget(widget);
      
      // Simulate installation process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mark as installed
      setWidgets(prev => prev.map(w => 
        w.id === widget.id ? { ...w, installed: true } : w
      ));

      onInstallWidget(widget);

      toast({
        title: "Widget Installed",
        description: `${widget.name} has been installed successfully`,
      });
    } catch (error) {
      toast({
        title: "Installation Failed",
        description: `Failed to install ${widget.name}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setInstallingWidgets(prev => {
        const newSet = new Set(prev);
        newSet.delete(widget.id);
        return newSet;
      });
    }
  };

  const getSourceIcon = (source: string) => {
    const sourceMap: Record<string, any> = {
      thingsboard: Database,
      "node-red": Cpu,
      grafana: BarChart3,
      freeboard: Activity,
      community: Globe
    };
    return sourceMap[source] || Package;
  };

  const getSourceColor = (source: string) => {
    const colorMap: Record<string, string> = {
      thingsboard: "bg-blue-100 text-blue-800",
      "node-red": "bg-red-100 text-red-800",
      grafana: "bg-orange-100 text-orange-800",
      freeboard: "bg-green-100 text-green-800",
      community: "bg-purple-100 text-purple-800"
    };
    return colorMap[source] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Store className="h-4 w-4" />
          Widget Marketplace
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Widget Marketplace
          </DialogTitle>
          <DialogDescription>
            Discover and install widgets from external IoT platforms and the community
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 p-4 border-b">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search widgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sources.map(source => (
                    <SelectItem key={source.id} value={source.id}>
                      <div className="flex items-center gap-2">
                        <source.icon className="h-4 w-4" />
                        {source.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Tabs */}
            <Tabs value={selectedSource} onValueChange={setSelectedSource}>
              <TabsList className="grid w-full grid-cols-6">
                {sources.map(source => (
                  <TabsTrigger key={source.id} value={source.id} className="gap-2">
                    <source.icon className="h-4 w-4" />
                    {source.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Widget Grid */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading widgets...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWidgets.map(widget => {
                  const SourceIcon = getSourceIcon(widget.source);
                  const isInstalling = installingWidgets.has(widget.id);

                  return (
                    <Card key={widget.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <SourceIcon className="h-5 w-5" />
                              {widget.name}
                              {widget.installed && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              {!widget.compatible && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getSourceColor(widget.source)}>
                                {widget.source}
                              </Badge>
                              <Badge variant="outline">v{widget.version}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {widget.rating}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {widget.description}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1">
                          {widget.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {widget.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{widget.tags.length - 3}
                            </Badge>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {widget.downloads.toLocaleString()} downloads
                          </span>
                          <span>by {widget.author}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleInstallWidget(widget)}
                            disabled={widget.installed || !widget.compatible || isInstalling}
                            className="flex-1"
                            size="sm"
                          >
                            {isInstalling ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Installing...
                              </>
                            ) : widget.installed ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Installed
                              </>
                            ) : !widget.compatible ? (
                              <>
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Incompatible
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Install
                              </>
                            )}
                          </Button>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {!loading && filteredWidgets.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Package className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No widgets found</p>
                <p className="text-sm">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}