import numpy as np
from datetime import datetime, timedelta


def predict_depletion(records, TAW, degree=3):
    if len(records) < degree + 1:
        raise ValueError(
            f"Need at least {degree + 1} records for degree {degree}"
        )

    # Sort records by timestamp
    records = sorted(
        records,
        key=lambda record: record["timestamp"]
    )

    # First timestamp as reference
    start_time = records[0]["timestamp"]

    # Convert timestamps to hours from first observation
    x = np.array([
        (record["timestamp"] - start_time).total_seconds() / 3600
        for record in records
    ])

    # D_current values
    y = np.array([
        record["D_current"]
        for record in records
    ])

    # Fit polynomial
    coefficients = np.polyfit(x, y, degree)
    model = np.poly1d(coefficients)

    # Start predicting after the last observed record
    # after first record
    last_timestamp = records[0]["timestamp"]
    last_x = x[0]

    predictions = []

    for hour in range(1, 1000):
        future_x = last_x + hour

        predicted_D = float(model(future_x))

        future_timestamp = last_timestamp + timedelta(hours=hour)

        predictions.append({
            "timestamp": future_timestamp,
            "D_current": predicted_D
        })

        # Stop when TAW is reached
        if predicted_D >= TAW:
            break

    return predictions

def predict_depletion_linear(timestamp, ETc, D_current, TAW):
    """
    ETc: mm/day
    D_current: current depletion in mm
    TAW: total available water in mm
    """

    if ETc <= 0:
        return []

    predictions = []

    hours = 1

    while True:
        predicted_D = D_current + ETc * (hours / 24)

        predicted_timestamp = timestamp + timedelta(hours=hours)

        predictions.append({
            "timestamp": predicted_timestamp,
            "D_current": predicted_D
        })

        if predicted_D >= TAW:
            break

        hours += 1

    return predictions


def predict_water_capacity(forecast_data, pump_data, power_source):
    """
    Predict the water-drawing capacity of the pump for each forecast hour.

    Returns:
        [
            {
                "time": ...,
                "available_power_kw": ...,
                "water_capacity_l": ...
            },
            ...
        ]

    Water capacity is the approximate amount of water the pump
    can draw during that one-hour period.
    """

    solar_capacity_kw = power_source["solar_capacity"]

    rated_power_kw = pump_data["rated_power_hp"] * 0.746
    rated_flow_lpm = pump_data["rated_flow_lpm"]

    results = []

    for forecast in forecast_data:
        solar_radiation = forecast["solar_radiation"]

        # Approximate fraction of rated solar output available
        solar_fraction = max(0, min(solar_radiation / 1000, 1))

        available_power_kw = (
            solar_capacity_kw * solar_fraction
        )

        # Fraction of pump's rated power available
        power_fraction = (
            available_power_kw / rated_power_kw
            if rated_power_kw > 0
            else 0
        )

        power_fraction = max(0, min(power_fraction, 1))

        # Approximate pump flow at available power
        flow_lpm = rated_flow_lpm * power_fraction

        # One forecast entry = one hour
        water_capacity_l = flow_lpm * 60

        results.append({
            "time": forecast["time"],
            "available_power_kw": available_power_kw,
            "water_capacity_l": water_capacity_l
        })

    return results