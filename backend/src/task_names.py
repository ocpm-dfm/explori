from enum import Enum
from typing import Any, List


class TaskName(Enum):
    CREATE_DFM = "create_dfm"
    COMPUTE_ALIGNMENTS = "compute_alignments"
    ALIGN_TIMES = "align_times"
    PERFORMANCE_METRICS = "performance_metrics"

    def with_attributes(self, **kwargs) -> str:
        """Sometimes, a big task is divided into subtasks.
        To represent this division, we add attributes (for example
        the object type) to the task name. This is handled by this method."""
        def flatten_values(values: Any | List[Any]) -> str:
            if isinstance(values, list):
                return f"({','.join(flatten_values(value) for value in values)})"
            else:
                return str(values)

        stringified_attributes = ''.join([f"[{key}={flatten_values(value)}]" for (key, value) in kwargs.items()])
        return self.value + stringified_attributes