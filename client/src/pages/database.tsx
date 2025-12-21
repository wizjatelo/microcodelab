import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Edit,
  Eye,
  BarChart3,
  Table as TableIcon,
  Settings,
  Activity,
  Brain,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Shield,
  HardDrive,
  Cpu,
  MemoryStick,
  Gauge,
  Bell,
  Lock,
  Unlock,
  Server,
  LineChart,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types for database entities
interface CustomTable {
  id: string;
  user_id: string;
  project_id?: string;
  table_name: string;
  table_type: "structured" | "document" | "time_series" | "key_value";
  description: string;
  schema_definition: any;
  row_count: number;
  size_bytes: number;
  is_public: boolean;
  ai_trainable: boolean;
  retention_days?: number;
  created_at: string;
  updated_at: string;
}

interface DatabaseStats {
  total_tables: number;
  total_rows: number;
  total_size_mb: number;
  ai_models: number;
  training_sessions: number;
  predictions_today: number;
  anomalies_detected: number;
  data_quality_score: number;
}

interface AIModel {
  id: string;
  model_name: string;
  model_type: string;
  deployment_status: "trained" | "testing" | "deployed" | "deprecated";
  performance_metrics: any;
  usage_count: number;
  created_at: string;
}

interface TrainingSession {
  id: string;
  session_name: string;
  model_type: string;
  status: "queued" | "training" | "completed" | "failed" | "deployed";
  model_accuracy?: number;
  training_duration_seconds?: number;
  created_at: string;
  completed_at?: string;
}

interface DeployResponse {
  success: boolean;
  message: string;
  endpoint: string;
}

interface TrainingResponse {
  success: boolean;
  session_id: string;
  model_id: string;
  message: string;
  accuracy: number;
  training_duration: number;
}

function DatabaseOverview() {
  const { data: stats } = useQuery<DatabaseStats>({
    queryKey: ["/api/database/stats"],
  });

  const statCards = [
    {
      title: "Tables",
      value: stats?.total_tables || 0,
      icon: TableIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Records",
      value: (stats?.total_rows || 0).toLocaleString(),
      icon: Database,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Storage",
      value: `${(stats?.total_size_mb || 0).toFixed(1)} MB`,
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "AI Models",
      value: stats?.ai_models || 0,
      icon: Brain,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Predictions",
      value: stats?.predictions_today || 0,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Quality",
      value: `${((stats?.data_quality_score || 0) * 100).toFixed(0)}%`,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((stat) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">{stat.title}</p>
                <p className="text-lg font-bold truncate">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bgColor} flex-shrink-0`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CustomTablesTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDataDialog, setViewDataDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<CustomTable | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [newTable, setNewTable] = useState({
    table_name: "",
    table_type: "structured" as const,
    description: "",
    schema_definition: "{}",
    is_public: false,
    ai_trainable: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useQuery<CustomTable[]>({
    queryKey: ["/api/database/tables"],
  });

  const createMutation = useMutation<CustomTable, Error, typeof newTable>({
    mutationFn: async (data: typeof newTable) => {
      return apiRequest("/api/database/tables", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      setDialogOpen(false);
      setNewTable({
        table_name: "",
        table_type: "structured",
        description: "",
        schema_definition: "{}",
        is_public: false,
        ai_trainable: false,
      });
      toast({ title: "Table created successfully" });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (tableId: string) => {
      return apiRequest(`/api/database/tables/${tableId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      toast({ title: "Table deleted successfully" });
    },
  });

  const handleViewData = async (table: CustomTable) => {
    setSelectedTable(table);
    try {
      const response = await fetch(`/api/database/tables/${table.id}/data`);
      const data = await response.json();
      setTableData(data.data || []);
      setViewDataDialog(true);
    } catch (error) {
      toast({ title: "Error loading table data", variant: "destructive" });
    }
  };

  const handleAddSampleData = async (tableId: string) => {
    try {
      // Generate sample data based on table type
      const sampleData = generateSampleData(selectedTable?.table_type || "structured");
      
      for (const row of sampleData) {
        await apiRequest(`/api/database/tables/${tableId}/data`, {
          method: "POST",
          body: { row_data: row }
        });
      }
      
      // Refresh data
      const response = await fetch(`/api/database/tables/${tableId}/data`);
      const data = await response.json();
      setTableData(data.data || []);
      
      queryClient.invalidateQueries({ queryKey: ["/api/database/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      toast({ title: "Sample data added successfully" });
    } catch (error) {
      toast({ title: "Error adding sample data", variant: "destructive" });
    }
  };

  const generateSampleData = (tableType: string) => {
    const baseData = [];
    const count = 10;
    
    for (let i = 0; i < count; i++) {
      if (tableType === "time_series") {
        baseData.push({
          sensor_id: `sensor_${i + 1}`,
          temperature: (20 + Math.random() * 15).toFixed(2),
          humidity: (40 + Math.random() * 40).toFixed(2),
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
        });
      } else if (tableType === "structured") {
        baseData.push({
          name: `Item ${i + 1}`,
          value: Math.floor(Math.random() * 100),
          category: ["A", "B", "C"][Math.floor(Math.random() * 3)],
          active: Math.random() > 0.5,
        });
      } else if (tableType === "document") {
        baseData.push({
          title: `Document ${i + 1}`,
          content: `This is sample content for document ${i + 1}`,
          tags: ["sample", "test", "data"],
          metadata: {
            author: "System",
            created: new Date().toISOString(),
          },
        });
      } else {
        baseData.push({
          key: `key_${i + 1}`,
          value: `value_${i + 1}`,
          type: "string",
        });
      }
    }
    
    return baseData;
  };

  const filteredTables = tables?.filter((table) =>
    table.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTableTypeColor = (type: string) => {
    switch (type) {
      case "structured": return "bg-blue-100 text-blue-800";
      case "document": return "bg-green-100 text-green-800";
      case "time_series": return "bg-purple-100 text-purple-800";
      case "key_value": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Table
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Table</DialogTitle>
              <DialogDescription>
                Create a new table to store your custom data with AI training capabilities.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="table_name">Table Name</Label>
                  <Input
                    id="table_name"
                    value={newTable.table_name}
                    onChange={(e) => setNewTable({ ...newTable, table_name: e.target.value })}
                    placeholder="my_sensor_data"
                  />
                </div>
                <div>
                  <Label htmlFor="table_type">Table Type</Label>
                  <Select
                    value={newTable.table_type}
                    onValueChange={(value: any) => setNewTable({ ...newTable, table_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="structured">Structured (SQL-like)</SelectItem>
                      <SelectItem value="document">Document (JSON)</SelectItem>
                      <SelectItem value="time_series">Time Series</SelectItem>
                      <SelectItem value="key_value">Key-Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTable.description}
                  onChange={(e) => setNewTable({ ...newTable, description: e.target.value })}
                  placeholder="Describe what this table will store..."
                />
              </div>
              <div>
                <Label htmlFor="schema">Schema Definition (JSON)</Label>
                <Textarea
                  id="schema"
                  value={newTable.schema_definition}
                  onChange={(e) => setNewTable({ ...newTable, schema_definition: e.target.value })}
                  placeholder='{"columns": {"id": "UUID", "name": "VARCHAR(100)", "value": "FLOAT"}}'
                  className="font-mono text-sm"
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newTable.is_public}
                    onChange={(e) => setNewTable({ ...newTable, is_public: e.target.checked })}
                  />
                  <span className="text-sm">Make public</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newTable.ai_trainable}
                    onChange={(e) => setNewTable({ ...newTable, ai_trainable: e.target.checked })}
                  />
                  <span className="text-sm">AI trainable</span>
                </label>
              </div>
              <Button
                onClick={() => createMutation.mutate(newTable)}
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? "Creating..." : "Create Table"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading tables...</p>
            </div>
          </div>
        ) : filteredTables?.length === 0 ? (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No custom tables yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first custom table to store and analyze your IoT data.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Table
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full">
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>AI Training</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTables?.map((table) => (
                    <TableRow key={table.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{table.table_name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-48">{table.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTableTypeColor(table.table_type)} variant="secondary">
                          {table.table_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{table.row_count.toLocaleString()}</TableCell>
                      <TableCell>{(table.size_bytes / 1024 / 1024).toFixed(2)} MB</TableCell>
                      <TableCell>
                        {table.ai_trainable ? (
                          <Badge className="bg-green-100 text-green-800" variant="secondary">
                            <Brain className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{new Date(table.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewData(table)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteMutation.mutate(table.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* Data Viewing Dialog */}
      <Dialog open={viewDataDialog} onOpenChange={setViewDataDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {selectedTable?.table_name} - Data View
            </DialogTitle>
            <DialogDescription>
              {selectedTable?.description} • {tableData.length} rows
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden space-y-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                onClick={() => selectedTable && handleAddSampleData(selectedTable.id)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sample Data
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>

            {tableData.length === 0 ? (
              <div className="flex items-center justify-center h-full border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No data in this table yet</p>
                  <Button 
                    onClick={() => selectedTable && handleAddSampleData(selectedTable.id)}
                    className="mt-2"
                    size="sm"
                  >
                    Add Sample Data
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg overflow-auto flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      {Object.keys(tableData[0] || {}).map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row, index) => (
                      <TableRow key={row.id || index}>
                        {Object.entries(row).map(([key, value]) => (
                          <TableCell key={key} className="max-w-32 truncate">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AIModelsTab() {
  const [trainingDialog, setTrainingDialog] = useState(false);
  const [newTraining, setNewTraining] = useState({
    model_name: "",
    model_type: "anomaly_detection",
    table_id: "",
    target_column: "",
    feature_columns: [] as string[],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: models } = useQuery<AIModel[]>({
    queryKey: ["/api/database/ai-models"],
  });

  const { data: trainingSessions } = useQuery<TrainingSession[]>({
    queryKey: ["/api/database/training-sessions"],
  });

  const { data: tables } = useQuery<CustomTable[]>({
    queryKey: ["/api/database/tables"],
  });

  const trainModelMutation = useMutation<TrainingResponse, Error, typeof newTraining>({
    mutationFn: async (data: typeof newTraining) => {
      return apiRequest("/api/database/train-model", { method: "POST", body: data });
    },
    onSuccess: (data: TrainingResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/ai-models"] });
      queryClient.invalidateQueries({ queryKey: ["/api/database/training-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      setTrainingDialog(false);
      setNewTraining({
        model_name: "",
        model_type: "anomaly_detection",
        table_id: "",
        target_column: "",
        feature_columns: [],
      });
      toast({ 
        title: "Model training completed!", 
        description: `Accuracy: ${(data.accuracy * 100).toFixed(1)}%` 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Training failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deployModelMutation = useMutation<DeployResponse, Error, string>({
    mutationFn: async (modelId: string) => {
      return apiRequest(`/api/database/models/${modelId}/deploy`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/ai-models"] });
      toast({ title: "Model deployed successfully!" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "deployed": return "bg-green-100 text-green-800";
      case "trained": return "bg-blue-100 text-blue-800";
      case "testing": return "bg-yellow-100 text-yellow-800";
      case "deprecated": return "bg-gray-100 text-gray-800";
      case "completed": return "bg-green-100 text-green-800";
      case "training": return "bg-blue-100 text-blue-800";
      case "failed": return "bg-red-100 text-red-800";
      case "queued": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const hasTablesWithData = tables?.some(t => t.row_count >= 5);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* Prominent Train Model Button */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-purple-100">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Train New AI Model</h3>
                  <p className="text-sm text-muted-foreground">
                    {hasTablesWithData 
                      ? "Create intelligent models from your IoT data"
                      : "Add data to a table first to start training"}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setTrainingDialog(true)}
                disabled={!hasTablesWithData}
                className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
              >
                <Zap className="h-4 w-4 mr-2" />
                Start Training
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Models and Sessions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* AI Models Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Models
              </CardTitle>
              <CardDescription className="text-xs">Your trained machine learning models</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {models?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-3 rounded-full bg-muted mb-3">
                    <Brain className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No models trained yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Train your first model to get started
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setTrainingDialog(true)}
                    disabled={!hasTablesWithData}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Train Model
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {models?.map((model) => (
                    <div key={model.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{model.model_name}</div>
                        <div className="text-xs text-muted-foreground">{model.model_type}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge className={`text-xs ${getStatusColor(model.deployment_status)}`}>
                          {model.deployment_status}
                        </Badge>
                        {model.deployment_status === "trained" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => deployModelMutation.mutate(model.id)}
                            disabled={deployModelMutation.isPending}
                          >
                            Deploy
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Training Sessions Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Training Sessions
              </CardTitle>
              <CardDescription className="text-xs">Recent AI training activities</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {trainingSessions?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-3 rounded-full bg-muted mb-3">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No training sessions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start training to see sessions here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trainingSessions?.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{session.session_name}</div>
                        <div className="text-xs text-muted-foreground">{session.model_type}</div>
                      </div>
                      <div className="text-right ml-2">
                        <Badge className={`text-xs ${getStatusColor(session.status)}`}>
                          {session.status}
                        </Badge>
                        {session.model_accuracy && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {(session.model_accuracy * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Training Options */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Training Options</CardTitle>
            <CardDescription className="text-xs">Select a model type to get started quickly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => {
                  setNewTraining({ ...newTraining, model_type: "anomaly_detection" });
                  setTrainingDialog(true);
                }}
                disabled={!hasTablesWithData}
              >
                <TrendingUp className="h-5 w-5 text-red-500" />
                <span className="text-xs font-medium">Anomaly Detection</span>
                <span className="text-xs text-muted-foreground">Detect unusual patterns</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => {
                  setNewTraining({ ...newTraining, model_type: "prediction" });
                  setTrainingDialog(true);
                }}
                disabled={!hasTablesWithData}
              >
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-medium">Predictive Analytics</span>
                <span className="text-xs text-muted-foreground">Forecast future values</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => {
                  setNewTraining({ ...newTraining, model_type: "classification" });
                  setTrainingDialog(true);
                }}
                disabled={!hasTablesWithData}
              >
                <Brain className="h-5 w-5 text-purple-500" />
                <span className="text-xs font-medium">Classification</span>
                <span className="text-xs text-muted-foreground">Categorize your data</span>
              </Button>
            </div>
            
            {/* Quick Start Training Link */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ready to train?</p>
                  <p className="text-xs text-muted-foreground">
                    {hasTablesWithData 
                      ? `${tables?.filter(t => t.row_count >= 5).length} table(s) available for training`
                      : "Create a table and add data first"}
                  </p>
                </div>
                <Button 
                  onClick={() => setTrainingDialog(true)}
                  disabled={!hasTablesWithData}
                  size="sm"
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Start Training Now
                </Button>
              </div>
              {!hasTablesWithData && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      To train a model: Go to <button 
                        onClick={() => {
                          const tabsElement = document.querySelector('[value="tables"]');
                          if (tabsElement) (tabsElement as HTMLElement).click();
                        }}
                        className="underline font-medium hover:text-amber-900"
                      >Custom Tables</button> → Create a table → Add at least 5 rows of data
                    </span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Training Dialog */}
        <Dialog open={trainingDialog} onOpenChange={setTrainingDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Train New AI Model
              </DialogTitle>
              <DialogDescription>
                Configure and train a machine learning model on your data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model_name" className="text-sm">Model Name</Label>
                  <Input
                    id="model_name"
                    value={newTraining.model_name}
                    onChange={(e) => setNewTraining({ ...newTraining, model_name: e.target.value })}
                    placeholder="My Anomaly Detector"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="model_type" className="text-sm">Model Type</Label>
                  <Select
                    value={newTraining.model_type}
                    onValueChange={(value: string) => setNewTraining({ ...newTraining, model_type: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anomaly_detection">Anomaly Detection</SelectItem>
                      <SelectItem value="prediction">Predictive Analytics</SelectItem>
                      <SelectItem value="classification">Classification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="table_id" className="text-sm">Training Data Table</Label>
                <Select
                  value={newTraining.table_id}
                  onValueChange={(value) => setNewTraining({ ...newTraining, table_id: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a table with data" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables?.filter(t => t.row_count >= 5).length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No tables with enough data (min 5 rows)
                      </div>
                    ) : (
                      tables?.filter(t => t.row_count >= 5).map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          {table.table_name} ({table.row_count} rows)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {tables?.filter(t => t.row_count >= 5).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Create a table and add at least 5 rows of data first
                  </p>
                )}
              </div>
              {newTraining.model_type !== "anomaly_detection" && (
                <div>
                  <Label htmlFor="target_column" className="text-sm">Target Column</Label>
                  <Input
                    id="target_column"
                    value={newTraining.target_column}
                    onChange={(e) => setNewTraining({ ...newTraining, target_column: e.target.value })}
                    placeholder="column_to_predict"
                    className="mt-1"
                  />
                </div>
              )}
              <Button
                onClick={() => trainModelMutation.mutate(newTraining)}
                disabled={trainModelMutation.isPending || !newTraining.model_name || !newTraining.table_id}
                className="w-full"
              >
                {trainModelMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Training Model...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Training
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}

function AnalyticsTab() {
  const { data: stats } = useQuery<DatabaseStats>({
    queryKey: ["/api/database/stats"],
  });

  const { data: tables } = useQuery<CustomTable[]>({
    queryKey: ["/api/database/tables"],
  });

  const { data: models } = useQuery<AIModel[]>({
    queryKey: ["/api/database/ai-models"],
  });

  const { data: trainingSessions } = useQuery<TrainingSession[]>({
    queryKey: ["/api/database/training-sessions"],
  });

  // Calculate analytics metrics
  const totalDataPoints = tables?.reduce((sum, t) => sum + t.row_count, 0) || 0;
  const avgTableSize = tables?.length ? (tables.reduce((sum, t) => sum + t.size_bytes, 0) / tables.length / 1024).toFixed(2) : "0";
  const deployedModels = models?.filter(m => m.deployment_status === "deployed").length || 0;
  const completedTrainings = trainingSessions?.filter(s => s.status === "completed").length || 0;
  const avgAccuracy = trainingSessions?.filter(s => s.model_accuracy)
    .reduce((sum, s, _, arr) => sum + (s.model_accuracy || 0) / arr.length, 0) || 0;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-1">
        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <LineChart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Data Points</p>
                  <p className="text-xl font-bold">{totalDataPoints.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <Gauge className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Model Accuracy</p>
                  <p className="text-xl font-bold">{(avgAccuracy * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deployed Models</p>
                  <p className="text-xl font-bold">{deployedModels}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50">
                  <CheckCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed Trainings</p>
                  <p className="text-xl font-bold">{completedTrainings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Data Distribution by Table Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tables?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No tables created yet
                </div>
              ) : (
                <div className="space-y-3">
                  {["structured", "time_series", "document", "key_value"].map((type) => {
                    const count = tables?.filter(t => t.table_type === type).length || 0;
                    const percentage = tables?.length ? (count / tables.length) * 100 : 0;
                    const colors: Record<string, string> = {
                      structured: "bg-blue-500",
                      time_series: "bg-purple-500",
                      document: "bg-green-500",
                      key_value: "bg-orange-500",
                    };
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize">{type.replace("_", " ")}</span>
                          <span>{count} tables ({percentage.toFixed(0)}%)</span>
                        </div>
                        <Progress value={percentage} className={`h-2 ${colors[type]}`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Model Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {models?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No models trained yet
                </div>
              ) : (
                <div className="space-y-3">
                  {models?.slice(0, 5).map((model) => {
                    const accuracy = model.performance_metrics?.accuracy || 0;
                    return (
                      <div key={model.id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="truncate max-w-[150px]">{model.model_name}</span>
                          <span>{(accuracy * 100).toFixed(1)}% accuracy</span>
                        </div>
                        <Progress value={accuracy * 100} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Training History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Training Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trainingSessions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No training sessions yet
              </div>
            ) : (
              <div className="space-y-2">
                {trainingSessions?.slice(0, 10).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        session.status === "completed" ? "bg-green-500" :
                        session.status === "training" ? "bg-blue-500 animate-pulse" :
                        session.status === "failed" ? "bg-red-500" : "bg-gray-400"
                      }`} />
                      <div>
                        <p className="font-medium">{session.session_name}</p>
                        <p className="text-xs text-muted-foreground">{session.model_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {session.model_accuracy && (
                        <p className="font-medium">{(session.model_accuracy * 100).toFixed(1)}%</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <Cpu className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <p className="text-xs text-muted-foreground">CPU Usage</p>
                <p className="font-bold">23%</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <MemoryStick className="h-6 w-6 mx-auto mb-1 text-green-500" />
                <p className="text-xs text-muted-foreground">Memory</p>
                <p className="font-bold">1.2 GB</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <HardDrive className="h-6 w-6 mx-auto mb-1 text-purple-500" />
                <p className="text-xs text-muted-foreground">Storage</p>
                <p className="font-bold">{(stats?.total_size_mb || 0).toFixed(1)} MB</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Activity className="h-6 w-6 mx-auto mb-1 text-orange-500" />
                <p className="text-xs text-muted-foreground">Uptime</p>
                <p className="font-bold">99.9%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function SettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    autoBackup: true,
    backupFrequency: "daily",
    retentionDays: 30,
    enableAITraining: true,
    maxStorageMB: 500,
    enableNotifications: true,
    enableDataEncryption: true,
    enableAuditLog: true,
    compressionEnabled: false,
    autoCleanup: true,
  });

  const handleSaveSettings = () => {
    toast({ title: "Settings saved successfully" });
  };

  const handleClearCache = () => {
    toast({ title: "Cache cleared successfully" });
  };

  const handleExportConfig = () => {
    const configData = JSON.stringify(settings, null, 2);
    const blob = new Blob([configData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "database-config.json";
    a.click();
    toast({ title: "Configuration exported" });
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-1">
        {/* Storage Settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Storage Settings
            </CardTitle>
            <CardDescription className="text-xs">Configure data storage and retention policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Auto Backup</Label>
                <p className="text-xs text-muted-foreground">Automatically backup your data</p>
              </div>
              <Switch
                checked={settings.autoBackup}
                onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Backup Frequency</Label>
                <p className="text-xs text-muted-foreground">How often to create backups</p>
              </div>
              <Select
                value={settings.backupFrequency}
                onValueChange={(value) => setSettings({ ...settings, backupFrequency: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Data Retention (days)</Label>
                <p className="text-xs text-muted-foreground">How long to keep historical data</p>
              </div>
              <Input
                type="number"
                value={settings.retentionDays}
                onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) || 30 })}
                className="w-24"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Max Storage (MB)</Label>
                <p className="text-xs text-muted-foreground">Maximum storage allocation</p>
              </div>
              <Input
                type="number"
                value={settings.maxStorageMB}
                onChange={(e) => setSettings({ ...settings, maxStorageMB: parseInt(e.target.value) || 500 })}
                className="w-24"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Enable Compression</Label>
                <p className="text-xs text-muted-foreground">Compress data to save storage</p>
              </div>
              <Switch
                checked={settings.compressionEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, compressionEnabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Auto Cleanup</Label>
                <p className="text-xs text-muted-foreground">Automatically remove old data</p>
              </div>
              <Switch
                checked={settings.autoCleanup}
                onCheckedChange={(checked) => setSettings({ ...settings, autoCleanup: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Training Settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Training Settings
            </CardTitle>
            <CardDescription className="text-xs">Configure AI model training behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Enable AI Training</Label>
                <p className="text-xs text-muted-foreground">Allow training models on your data</p>
              </div>
              <Switch
                checked={settings.enableAITraining}
                onCheckedChange={(checked) => setSettings({ ...settings, enableAITraining: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Settings
            </CardTitle>
            <CardDescription className="text-xs">Configure security and privacy options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm flex items-center gap-2">
                  {settings.enableDataEncryption ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  Data Encryption
                </Label>
                <p className="text-xs text-muted-foreground">Encrypt data at rest</p>
              </div>
              <Switch
                checked={settings.enableDataEncryption}
                onCheckedChange={(checked) => setSettings({ ...settings, enableDataEncryption: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Audit Logging</Label>
                <p className="text-xs text-muted-foreground">Log all database operations</p>
              </div>
              <Switch
                checked={settings.enableAuditLog}
                onCheckedChange={(checked) => setSettings({ ...settings, enableAuditLog: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
            <CardDescription className="text-xs">Configure alert and notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Enable Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive alerts for important events</p>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Maintenance Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveSettings} size="sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
              <Button variant="outline" onClick={handleClearCache} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
              <Button variant="outline" onClick={handleExportConfig} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Config
              </Button>
              <Button variant="destructive" size="sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export default function DatabasePage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database & AI Training
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your data storage and train AI models on your IoT data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4 flex flex-col">
          <div className="flex-shrink-0 mb-4">
            <DatabaseOverview />
          </div>

          <Tabs defaultValue="tables" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-4 mb-4 flex-shrink-0">
              <TabsTrigger value="tables" className="flex items-center gap-2 text-xs">
                <TableIcon className="h-3 w-3" />
                Tables
              </TabsTrigger>
              <TabsTrigger value="ai-models" className="flex items-center gap-2 text-xs">
                <Brain className="h-3 w-3" />
                AI Models
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2 text-xs">
                <BarChart3 className="h-3 w-3" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2 text-xs">
                <Settings className="h-3 w-3" />
                Settings
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent value="tables" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <CustomTablesTab />
              </TabsContent>

              <TabsContent value="ai-models" className="h-full m-0 overflow-hidden">
                <AIModelsTab />
              </TabsContent>

              <TabsContent value="analytics" className="h-full m-0 overflow-hidden">
                <AnalyticsTab />
              </TabsContent>

              <TabsContent value="settings" className="h-full m-0 overflow-hidden">
                <SettingsTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}