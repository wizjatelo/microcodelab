"""
Database Management Routes for µCodeLab v2.0
Handles custom user tables, AI training data, and database operations
"""

import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

# Mock storage for demonstration - in production, use actual database
mock_database = {
    "custom_tables": [],
    "ai_models": [],
    "training_sessions": [],
    "table_data": {},  # Store actual table data: {table_id: [rows]}
    "predictions": [],
    "anomalies": [],
    "database_stats": {
        "total_tables": 0,
        "total_rows": 0,
        "total_size_mb": 0.0,
        "ai_models": 0,
        "training_sessions": 0,
        "predictions_today": 0,
        "anomalies_detected": 0,
        "data_quality_score": 0.0
    }
}

router = APIRouter(prefix="/api/database", tags=["database"])

# ============== Pydantic Models ==============

class CreateCustomTable(BaseModel):
    table_name: str
    table_type: str  # structured, document, time_series, key_value
    description: str
    schema_definition: str  # JSON string
    is_public: bool = False
    ai_trainable: bool = False
    retention_days: Optional[int] = None

class CustomTable(BaseModel):
    id: str
    user_id: str
    project_id: Optional[str] = None
    table_name: str
    table_type: str
    description: str
    schema_definition: Dict[str, Any]
    row_count: int
    size_bytes: int
    is_public: bool
    ai_trainable: bool
    retention_days: Optional[int]
    created_at: str
    updated_at: str

class AIModel(BaseModel):
    id: str
    user_id: str
    model_name: str
    model_type: str
    deployment_status: str
    performance_metrics: Dict[str, Any]
    usage_count: int
    created_at: str

class TrainingSession(BaseModel):
    id: str
    user_id: str
    session_name: str
    model_type: str
    status: str
    model_accuracy: Optional[float]
    training_duration_seconds: Optional[int]
    created_at: str
    completed_at: Optional[str]

class TableData(BaseModel):
    table_id: str
    data: List[Dict[str, Any]]

class ImportData(BaseModel):
    table_id: str
    data: List[Dict[str, Any]]
    import_mode: str = "append"  # append, replace, update

class StartTraining(BaseModel):
    model_name: str
    model_type: str  # anomaly_detection, prediction, classification
    table_id: str
    target_column: Optional[str] = None
    feature_columns: List[str] = []

class DatabaseStats(BaseModel):
    total_tables: int
    total_rows: int
    total_size_mb: float
    ai_models: int
    training_sessions: int
    predictions_today: int
    anomalies_detected: int
    data_quality_score: float

# ============== Helper Functions ==============

def calculate_data_quality_score():
    """Calculate overall data quality score"""
    if not mock_database["custom_tables"]:
        return 0.0
    
    total_score = 0.0
    table_count = 0
    
    for table in mock_database["custom_tables"]:
        table_id = table["id"]
        table_data = mock_database["table_data"].get(table_id, [])
        
        if not table_data:
            continue
            
        # Simple quality metrics
        completeness = sum(1 for row in table_data if all(v is not None for v in row.values())) / len(table_data)
        consistency = 1.0  # Simplified - in real implementation, check data consistency
        accuracy = 0.95  # Simplified - in real implementation, validate against rules
        
        table_score = (completeness * 0.4 + consistency * 0.3 + accuracy * 0.3)
        total_score += table_score
        table_count += 1
    
    return total_score / table_count if table_count > 0 else 0.0

def update_table_stats(table_id: str):
    """Update table statistics after data changes"""
    table = next((t for t in mock_database["custom_tables"] if t["id"] == table_id), None)
    if not table:
        return
    
    table_data = mock_database["table_data"].get(table_id, [])
    table["row_count"] = len(table_data)
    
    # Estimate size (simplified calculation)
    estimated_size = len(str(table_data).encode('utf-8'))
    table["size_bytes"] = estimated_size
    table["updated_at"] = datetime.now().isoformat()
    
    # Update global stats
    mock_database["database_stats"]["data_quality_score"] = calculate_data_quality_score()

# ============== Database Statistics ==============

@router.get("/stats", response_model=DatabaseStats)
async def get_database_stats():
    """Get overall database statistics and metrics"""
    # Update stats based on current data
    stats = mock_database["database_stats"].copy()
    stats["total_tables"] = len(mock_database["custom_tables"])
    stats["ai_models"] = len(mock_database["ai_models"])
    stats["training_sessions"] = len(mock_database["training_sessions"])
    
    # Calculate total rows and size from tables
    total_rows = sum(table.get("row_count", 0) for table in mock_database["custom_tables"])
    total_size = sum(table.get("size_bytes", 0) for table in mock_database["custom_tables"])
    
    stats["total_rows"] = total_rows
    stats["total_size_mb"] = total_size / (1024 * 1024)
    
    return DatabaseStats(**stats)

# ============== Custom Tables Management ==============

@router.get("/tables", response_model=List[CustomTable])
async def get_custom_tables():
    """Get all custom tables for the user"""
    return [CustomTable(**table) for table in mock_database["custom_tables"]]

@router.post("/tables", response_model=CustomTable, status_code=201)
async def create_custom_table(data: CreateCustomTable):
    """Create a new custom table"""
    try:
        # Parse schema definition
        schema_def = json.loads(data.schema_definition)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON in schema_definition")
    
    # Create new table
    table_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    new_table = {
        "id": table_id,
        "user_id": "user-1",  # Mock user ID
        "project_id": None,
        "table_name": data.table_name,
        "table_type": data.table_type,
        "description": data.description,
        "schema_definition": schema_def,
        "row_count": 0,
        "size_bytes": 0,
        "is_public": data.is_public,
        "ai_trainable": data.ai_trainable,
        "retention_days": data.retention_days,
        "created_at": now,
        "updated_at": now
    }
    
    mock_database["custom_tables"].append(new_table)
    mock_database["table_data"][table_id] = []  # Initialize empty data
    return CustomTable(**new_table)

@router.get("/tables/{table_id}", response_model=CustomTable)
async def get_custom_table(table_id: str):
    """Get a specific custom table"""
    table = next((t for t in mock_database["custom_tables"] if t["id"] == table_id), None)
    if not table:
        raise HTTPException(404, "Table not found")
    return CustomTable(**table)

@router.patch("/tables/{table_id}", response_model=CustomTable)
async def update_custom_table(table_id: str, updates: Dict[str, Any]):
    """Update a custom table"""
    table = next((t for t in mock_database["custom_tables"] if t["id"] == table_id), None)
    if not table:
        raise HTTPException(404, "Table not found")
    
    # Update fields
    for key, value in updates.items():
        if key in table:
            table[key] = value
    
    table["updated_at"] = datetime.now().isoformat()
    return CustomTable(**table)

@router.delete("/tables/{table_id}", status_code=204)
async def delete_custom_table(table_id: str):
    """Delete a custom table"""
    table_index = next((i for i, t in enumerate(mock_database["custom_tables"]) if t["id"] == table_id), None)
    if table_index is None:
        raise HTTPException(404, "Table not found")
    
    mock_database["custom_tables"].pop(table_index)
    # Also delete the table data
    if table_id in mock_database["table_data"]:
        del mock_database["table_data"][table_id]
    return Response(status_code=204)

# ============== Table Data Management ==============

@router.get("/tables/{table_id}/data")
async def get_table_data(table_id: str, limit: int = 100, offset: int = 0):
    """Get data from a custom table"""
    table = next((t for t in mock_database["custom_tables"] if t["id"] == table_id), None)
    if not table:
        raise HTTPException(404, "Table not found")
    
    table_data = mock_database["table_data"].get(table_id, [])
    
    # Apply pagination
    paginated_data = table_data[offset:offset + limit]
    
    return {
        "table_id": table_id,
        "data": paginated_data,
        "total_rows": len(table_data),
        "offset": offset,
        "limit": limit
    }

@router.post("/tables/{table_id}/data")
async def add_table_data(table_id: str, data: Dict[str, Any]):
    """Add a single row to a table"""
    table = next((t for t in mock_database["custom_tables"] if t["id"] == table_id), None)
    if not table:
        raise HTTPException(404, "Table not found")
    
    if table_id not in mock_database["table_data"]:
        mock_database["table_data"][table_id] = []
    
    # Add timestamp if not provided
    row_data = data.get("row_data", {})
    if "timestamp" not in row_data:
        row_data["timestamp"] = datetime.now().isoformat()
    
    # Add unique ID if not provided
    if "id" not in row_data:
        row_data["id"] = str(uuid.uuid4())
    
    mock_database["table_data"][table_id].append(row_data)
    update_table_stats(table_id)
    
    return {
        "success": True,
        "message": "Row added successfully",
        "row_id": row_data["id"]
    }

@router.put("/tables/{table_id}/data/{row_id}")
async def update_table_row(table_id: str, row_id: str, data: Dict[str, Any]):
    """Update a specific row in a table"""
    table = next((t for t in mock_database["custom_tables"] if t["id"] == table_id), None)
    if not table:
        raise HTTPException(404, "Table not found")
    
    table_data = mock_database["table_data"].get(table_id, [])
    row_index = next((i for i, row in enumerate(table_data) if row.get("id") == row_id), None)
    
    if row_index is None:
        raise HTTPException(404, "Row not found")
    
    # Update the row
    updated_data = data.get("row_data", {})
    updated_data["id"] = row_id  # Preserve ID
    updated_data["updated_at"] = datetime.now().isoformat()
    
    mock_database["table_data"][table_id][row_index] = updated_data
    update_table_stats(table_id)
    
    return {
        "success": True,
        "message": "Row updated successfully"
    }

@router.delete("/tables/{table_id}/data/{row_id}")
async def delete_table_row(table_id: str, row_id: str):
    """Delete a specific row from a table"""
    table = next((t for t in mock_database["custom_tables"] if t["id"] == table_id), None)
    if not table:
        raise HTTPException(404, "Table not found")
    
    table_data = mock_database["table_data"].get(table_id, [])
    row_index = next((i for i, row in enumerate(table_data) if row.get("id") == row_id), None)
    
    if row_index is None:
        raise HTTPException(404, "Row not found")
    
    mock_database["table_data"][table_id].pop(row_index)
    update_table_stats(table_id)
    
    return {
        "success": True,
        "message": "Row deleted successfully"
    }

# ============== AI Models Management ==============

@router.get("/ai-models", response_model=List[AIModel])
async def get_ai_models():
    """Get all AI models for the user"""
    return [AIModel(**model) for model in mock_database["ai_models"]]

@router.post("/ai-models", response_model=AIModel, status_code=201)
async def create_ai_model(data: Dict[str, Any]):
    """Create a new AI model"""
    model_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    new_model = {
        "id": model_id,
        "user_id": "user-1",
        "model_name": data.get("model_name", "Untitled Model"),
        "model_type": data.get("model_type", "classification"),
        "deployment_status": "trained",
        "performance_metrics": data.get("performance_metrics", {}),
        "usage_count": 0,
        "created_at": now
    }
    
    mock_database["ai_models"].append(new_model)
    return AIModel(**new_model)

# ============== Training Sessions Management ==============

@router.get("/training-sessions", response_model=List[TrainingSession])
async def get_training_sessions():
    """Get all training sessions for the user"""
    return [TrainingSession(**session) for session in mock_database["training_sessions"]]

@router.post("/training-sessions", response_model=TrainingSession, status_code=201)
async def create_training_session(data: Dict[str, Any]):
    """Start a new training session"""
    session_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    new_session = {
        "id": session_id,
        "user_id": "user-1",
        "session_name": data.get("session_name", "Training Session"),
        "model_type": data.get("model_type", "classification"),
        "status": "queued",
        "model_accuracy": None,
        "training_duration_seconds": None,
        "created_at": now,
        "completed_at": None
    }
    
    mock_database["training_sessions"].append(new_session)
    return TrainingSession(**new_session)

# ============== Data Import/Export ==============

@router.post("/import")
async def import_data(data: ImportData):
    """Import data into a custom table"""
    table = next((t for t in mock_database["custom_tables"] if t["id"] == data.table_id), None)
    if not table:
        raise HTTPException(404, "Table not found")
    
    if data.table_id not in mock_database["table_data"]:
        mock_database["table_data"][data.table_id] = []
    
    imported_rows = 0
    
    for row in data.data:
        # Add metadata to each row
        if "id" not in row:
            row["id"] = str(uuid.uuid4())
        if "imported_at" not in row:
            row["imported_at"] = datetime.now().isoformat()
        
        if data.import_mode == "replace":
            mock_database["table_data"][data.table_id] = []
        
        mock_database["table_data"][data.table_id].append(row)
        imported_rows += 1
    
    update_table_stats(data.table_id)
    
    return {
        "success": True,
        "rows_imported": imported_rows,
        "total_rows": len(mock_database["table_data"][data.table_id]),
        "message": f"Successfully imported {imported_rows} rows"
    }

@router.get("/export/{table_id}")
async def export_data(table_id: str, format: str = "json"):
    """Export data from a custom table"""
    table = next((t for t in mock_database["custom_tables"] if t["id"] == table_id), None)
    if not table:
        raise HTTPException(404, "Table not found")
    
    table_data = mock_database["table_data"].get(table_id, [])
    
    export_data = {
        "table_info": {
            "id": table["id"],
            "name": table["table_name"],
            "type": table["table_type"],
            "description": table["description"]
        },
        "exported_at": datetime.now().isoformat(),
        "row_count": len(table_data),
        "data": table_data
    }
    
    return export_data

@router.get("/tables/{table_id}/analytics")
async def get_table_analytics(table_id: str):
    """Get analytics for a specific table"""
    table = next((t for t in mock_database["custom_tables"] if t["id"] == table_id), None)
    if not table:
        raise HTTPException(404, "Table not found")
    
    table_data = mock_database["table_data"].get(table_id, [])
    
    if not table_data:
        return {
            "table_id": table_id,
            "analytics": {
                "row_count": 0,
                "columns": [],
                "data_types": {},
                "null_counts": {},
                "unique_counts": {}
            }
        }
    
    # Analyze data structure
    all_columns = set()
    for row in table_data:
        all_columns.update(row.keys())
    
    analytics = {
        "row_count": len(table_data),
        "columns": list(all_columns),
        "data_types": {},
        "null_counts": {},
        "unique_counts": {},
        "sample_data": table_data[:5]  # First 5 rows as sample
    }
    
    # Analyze each column
    for column in all_columns:
        values = [row.get(column) for row in table_data]
        non_null_values = [v for v in values if v is not None]
        
        analytics["null_counts"][column] = len(values) - len(non_null_values)
        analytics["unique_counts"][column] = len(set(str(v) for v in non_null_values))
        
        # Determine data type
        if non_null_values:
            sample_value = non_null_values[0]
            if isinstance(sample_value, bool):
                analytics["data_types"][column] = "boolean"
            elif isinstance(sample_value, int):
                analytics["data_types"][column] = "integer"
            elif isinstance(sample_value, float):
                analytics["data_types"][column] = "float"
            elif isinstance(sample_value, str):
                analytics["data_types"][column] = "string"
            else:
                analytics["data_types"][column] = "mixed"
        else:
            analytics["data_types"][column] = "unknown"
    
    return {
        "table_id": table_id,
        "analytics": analytics
    }

# ============== AI Training Operations ==============

@router.post("/train-model")
async def train_model(data: StartTraining):
    """Start training a new AI model"""
    table = next((t for t in mock_database["custom_tables"] if t["id"] == data.table_id), None)
    if not table:
        raise HTTPException(404, "Table not found")
    
    table_data = mock_database["table_data"].get(data.table_id, [])
    if len(table_data) < 5:
        raise HTTPException(400, "Need at least 5 rows of data to train a model")
    
    # Create training session
    session_id = str(uuid.uuid4())
    model_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    training_session = {
        "id": session_id,
        "user_id": "user-1",
        "session_name": f"{data.model_name} Training",
        "model_type": data.model_type,
        "status": "training",
        "model_accuracy": None,
        "training_duration_seconds": None,
        "created_at": now,
        "completed_at": None,
        "dataset_size": len(table_data),
        "table_id": data.table_id
    }
    
    mock_database["training_sessions"].append(training_session)
    
    # Simulate training completion after a short delay
    import random
    training_duration = random.randint(30, 300)  # 30 seconds to 5 minutes
    accuracy = random.uniform(0.75, 0.98)  # Random accuracy between 75-98%
    
    # Update session to completed
    training_session["status"] = "completed"
    training_session["model_accuracy"] = accuracy
    training_session["training_duration_seconds"] = training_duration
    training_session["completed_at"] = datetime.now().isoformat()
    
    # Create the trained model
    new_model = {
        "id": model_id,
        "user_id": "user-1",
        "training_session_id": session_id,
        "model_name": data.model_name,
        "model_type": data.model_type,
        "deployment_status": "trained",
        "performance_metrics": {
            "accuracy": accuracy,
            "precision": accuracy * 0.95,
            "recall": accuracy * 0.92,
            "f1_score": accuracy * 0.93,
            "training_samples": len(table_data)
        },
        "usage_count": 0,
        "created_at": now,
        "table_id": data.table_id,
        "target_column": data.target_column,
        "feature_columns": data.feature_columns
    }
    
    mock_database["ai_models"].append(new_model)
    
    return {
        "success": True,
        "session_id": session_id,
        "model_id": model_id,
        "message": "Model training completed successfully",
        "accuracy": accuracy,
        "training_duration": training_duration
    }

@router.post("/models/{model_id}/deploy")
async def deploy_model(model_id: str):
    """Deploy a trained model"""
    model = next((m for m in mock_database["ai_models"] if m["id"] == model_id), None)
    if not model:
        raise HTTPException(404, "Model not found")
    
    model["deployment_status"] = "deployed"
    model["deployment_endpoint"] = f"/api/models/{model_id}/predict"
    
    return {
        "success": True,
        "message": "Model deployed successfully",
        "endpoint": model["deployment_endpoint"]
    }

@router.post("/models/{model_id}/predict")
async def make_prediction(model_id: str, input_data: Dict[str, Any]):
    """Make a prediction using a deployed model"""
    model = next((m for m in mock_database["ai_models"] if m["id"] == model_id), None)
    if not model:
        raise HTTPException(404, "Model not found")
    
    if model["deployment_status"] != "deployed":
        raise HTTPException(400, "Model is not deployed")
    
    # Mock prediction
    import random
    
    prediction_id = str(uuid.uuid4())
    confidence = random.uniform(0.6, 0.95)
    
    if model["model_type"] == "anomaly_detection":
        prediction_result = {
            "is_anomaly": random.choice([True, False]),
            "anomaly_score": random.uniform(0.0, 1.0),
            "confidence": confidence
        }
    elif model["model_type"] == "classification":
        classes = ["normal", "warning", "critical"]
        prediction_result = {
            "predicted_class": random.choice(classes),
            "confidence": confidence,
            "probabilities": {cls: random.uniform(0.1, 0.9) for cls in classes}
        }
    else:  # prediction/regression
        prediction_result = {
            "predicted_value": random.uniform(10.0, 100.0),
            "confidence": confidence,
            "prediction_interval": [random.uniform(5.0, 15.0), random.uniform(95.0, 105.0)]
        }
    
    # Store prediction
    prediction_record = {
        "id": prediction_id,
        "model_id": model_id,
        "input_data": input_data,
        "prediction": prediction_result,
        "confidence_score": confidence,
        "timestamp": datetime.now().isoformat()
    }
    
    mock_database["predictions"].append(prediction_record)
    
    # Update model usage count
    model["usage_count"] += 1
    model["last_used_at"] = datetime.now().isoformat()
    
    return {
        "prediction_id": prediction_id,
        "result": prediction_result,
        "model_info": {
            "model_name": model["model_name"],
            "model_type": model["model_type"]
        }
    }

@router.get("/predictions/{model_id}")
async def get_model_predictions(model_id: str, limit: int = 100):
    """Get recent predictions from an AI model"""
    model = next((m for m in mock_database["ai_models"] if m["id"] == model_id), None)
    if not model:
        raise HTTPException(404, "Model not found")
    
    # Mock predictions data
    predictions = []
    for i in range(min(limit, 10)):  # Mock up to 10 predictions
        predictions.append({
            "id": str(uuid.uuid4()),
            "input_data": {"feature_1": i * 0.1, "feature_2": i * 0.2},
            "prediction": {"class": "normal", "confidence": 0.85 + i * 0.01},
            "timestamp": datetime.now().isoformat()
        })
    
    return {
        "model_id": model_id,
        "predictions": predictions,
        "total_count": len(predictions)
    }

# No sample data initialization - all data is user-created