from bisect import bisect_left, bisect_right
from datetime import datetime, timedelta

import numpy as np


def predict_best_irrigation_window(
    latest_record,
    poly_predictions,
    forecast_data,
    water_capacities_prediction,
    field_area,
    RAW,
    TAW
):
    """
    Find the best irrigation window using 30-minute candidate starts.

    Cost:
        average depletion during irrigation window
        + irrigation duration in hours

    RAW:
        desired depletion target

    TAW:
        hard upper depletion limit
    """

    latest_timestamp = latest_record["timestamp"]
    current_D = latest_record["D_current"]

    # ---------------------------------------------------------
    # Convert forecast + water capacity data into 30-minute data
    # ---------------------------------------------------------

    half_hour_data = []

    for forecast, capacity in zip(
        forecast_data,
        water_capacities_prediction
    ):
        timestamp = datetime.fromisoformat(
            forecast["time"].replace("Z", "+00:00")
        )

        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(
                tzinfo=latest_timestamp.tzinfo
            )

        half_hour_rain = max(
            0,
            forecast.get("rain_mm", 0)
        ) / 2

        half_hour_capacity = max(
            0,
            capacity.get("water_capacity_l", 0)
        ) / 2

        # Hour start
        half_hour_data.append({
            "time": timestamp,
            "rain_mm": half_hour_rain,
            "water_capacity_l": half_hour_capacity
        })

        # 30 minutes later
        half_hour_data.append({
            "time": timestamp + timedelta(minutes=30),
            "rain_mm": half_hour_rain,
            "water_capacity_l": half_hour_capacity
        })

    half_hour_data.sort(key=lambda x: x["time"])

    # ---------------------------------------------------------
    # Build polyfit depletion lookup
    # ---------------------------------------------------------

    poly_points = [
        (latest_timestamp, current_D)
    ]

    for prediction in poly_predictions:
        poly_timestamp = prediction["timestamp"]

        if poly_timestamp.tzinfo is None:
            poly_timestamp = poly_timestamp.replace(
                tzinfo=latest_timestamp.tzinfo
            )

        poly_points.append(
            (
                poly_timestamp,
                prediction["D_current"]
            )
        )

    poly_times = [point[0] for point in poly_points]

    poly_hours = np.array([
        (timestamp - latest_timestamp).total_seconds() / 3600
        for timestamp in poly_times
    ])

    poly_values = np.array([
        depletion
        for _, depletion in poly_points
    ])

    def get_poly_depletion(timestamp):
        hours = (
            timestamp - latest_timestamp
        ).total_seconds() / 3600

        return float(
            np.interp(
                hours,
                poly_hours,
                poly_values
            )
        )

    # ---------------------------------------------------------
    # Rainfall lookup
    # ---------------------------------------------------------

    forecast_times = [
        item["time"]
        for item in half_hour_data
    ]

    rain_prefix = [0.0]

    for item in half_hour_data:
        rain_prefix.append(
            rain_prefix[-1] + item["rain_mm"]
        )

    def rainfall_before(timestamp):
        index = bisect_left(
            forecast_times,
            timestamp
        )

        return rain_prefix[index]

    def next_rain_after(timestamp):
        index = bisect_right(
            forecast_times,
            timestamp
        )

        for i in range(index, len(half_hour_data)):
            if half_hour_data[i]["rain_mm"] > 0:
                return half_hour_data[i]["time"]

        return None

    # ---------------------------------------------------------
    # Water capacity lookup
    # ---------------------------------------------------------

    capacity_by_time = {
        item["time"]: item["water_capacity_l"]
        for item in half_hour_data
    }

    # ---------------------------------------------------------
    # Upper simulation limit
    # ---------------------------------------------------------

    if not poly_predictions:
        return None, None

    TAW_time = poly_predictions[-1]["timestamp"]

    if TAW_time.tzinfo is None:
        TAW_time = TAW_time.replace(
            tzinfo=latest_timestamp.tzinfo
        )

    forecast_end = half_hour_data[-1]["time"]

    global_end = min(
        TAW_time,
        forecast_end
    )

    # ---------------------------------------------------------
    # Candidate start times: every 30 minutes
    # ---------------------------------------------------------

    candidate_starts = []

    current_time = latest_timestamp

    while current_time <= global_end:
        candidate_starts.append(current_time)
        current_time += timedelta(minutes=30)

    best_cost = float("inf")
    best_start = None
    best_end = None

    # ---------------------------------------------------------
    # Evaluate every candidate
    # ---------------------------------------------------------

    for start_time in candidate_starts:

        # Don't start irrigation while rain is already predicted
        current_rain_index = bisect_left(
            forecast_times,
            start_time
        )

        if (
            current_rain_index < len(half_hour_data)
            and half_hour_data[current_rain_index]["time"] == start_time
            and half_hour_data[current_rain_index]["rain_mm"] > 0
        ):
            continue

        next_rain = next_rain_after(start_time)

        # Rain or TAW -> whichever comes first
        deadline = global_end

        if next_rain is not None:
            deadline = min(
                deadline,
                next_rain
            )

        if start_time >= deadline:
            continue

        # -----------------------------------------------------
        # Calculate how much irrigation is actually required
        # to keep D <= RAW until the deadline.
        #
        # We use the polyfit trajectory as the no-irrigation
        # baseline and subtract predicted rainfall.
        # -----------------------------------------------------

        required_mm = 0.0

        simulation_time = start_time + timedelta(minutes=30)

        required_by_time = []

        while simulation_time <= deadline:

            baseline_D = get_poly_depletion(
                simulation_time
            )

            accumulated_rain = rainfall_before(
                simulation_time
            ) - rainfall_before(
                start_time
            )

            no_irrigation_D = max(
                0.0,
                baseline_D - accumulated_rain
            )

            required_for_RAW = max(
                0.0,
                no_irrigation_D - RAW
            )

            required_mm = max(
                required_mm,
                required_for_RAW
            )

            required_by_time.append({
                "time": simulation_time,
                "required_mm": required_for_RAW
            })

            simulation_time += timedelta(minutes=30)

        # No irrigation is necessary before rain/TAW
        if required_mm <= 0:
            continue

        # -----------------------------------------------------
        # Start pumping continuously from candidate start.
        # Find when enough water has been delivered.
        # -----------------------------------------------------

        cumulative_water_l = 0.0
        irrigation_end = None

        simulation_time = start_time

        feasible = True

        while simulation_time < deadline:

            water_this_step = capacity_by_time.get(
                simulation_time,
                0.0
            )

            cumulative_water_l += water_this_step

            cumulative_water_mm = (
                cumulative_water_l / field_area
            )

            step_end = simulation_time + timedelta(
                minutes=30
            )

            # Find depletion requirement at this point
            baseline_D = get_poly_depletion(
                step_end
            )

            accumulated_rain = rainfall_before(
                step_end
            ) - rainfall_before(
                start_time
            )

            no_irrigation_D = max(
                0.0,
                baseline_D - accumulated_rain
            )

            required_at_step = max(
                0.0,
                no_irrigation_D - RAW
            )

            # Pump hasn't supplied enough before depletion
            # becomes unacceptable.
            if cumulative_water_mm + 1e-9 < required_at_step:
                # Keep simulating because later solar may be
                # stronger; but if the threshold is crossed
                # physically before water arrives, reject.
                if no_irrigation_D >= TAW:
                    feasible = False
                    break

            # Enough total water has now been delivered
            if cumulative_water_mm >= required_mm:
                irrigation_end = step_end
                break

            simulation_time = step_end

        if not feasible or irrigation_end is None:
            continue

        # -----------------------------------------------------
        # Calculate average D_current during actual
        # irrigation window
        # -----------------------------------------------------

        depletion_values = []

        cumulative_water_l = 0.0
        simulation_time = start_time

        while simulation_time <= irrigation_end:

            baseline_D = get_poly_depletion(
                simulation_time
            )

            accumulated_rain = rainfall_before(
                simulation_time
            ) - rainfall_before(
                start_time
            )

            natural_D = max(
                0.0,
                baseline_D - accumulated_rain
            )

            if simulation_time > start_time:
                previous_time = (
                    simulation_time
                    - timedelta(minutes=30)
                )

                cumulative_water_l += capacity_by_time.get(
                    previous_time,
                    0.0
                )

            irrigation_reduction_mm = (
                cumulative_water_l / field_area
            )

            actual_D = max(
                0.0,
                natural_D - irrigation_reduction_mm
            )

            depletion_values.append(actual_D)

            simulation_time += timedelta(minutes=30)

        avg_D = (
            sum(depletion_values)
            / len(depletion_values)
        )

        duration_hours = (
            irrigation_end - start_time
        ).total_seconds() / 3600

        # Your requested cost function
        cost = avg_D + duration_hours

        if cost < best_cost:
            best_cost = cost
            best_start = start_time
            best_end = irrigation_end

    return best_start, best_end