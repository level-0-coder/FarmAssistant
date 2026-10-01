# kc_calculator.py

def calculate_kc(
    kc_table: float,
    wind_speed: float,
    rh_min: float,
    crop_height: float
) -> float:
    """
    Calculate climate-adjusted crop coefficient (Kc)
    using the FAO-56 adjustment equation.

    Parameters
    ----------
    kc_table : float
        Tabulated Kc value, e.g. Kc_mid from FAO-56.

    wind_speed : float
        Mean wind speed at 2 m height (m/s).

    rh_min : float
        Minimum relative humidity (%).

    crop_height : float
        Crop height (m).

    Returns
    -------
    float
        Climate-adjusted Kc.
    """

    adjustment = (
        0.04 * (wind_speed - 2)
        - 0.004 * (rh_min - 45)
    ) * (crop_height / 3) ** 0.3

    kc = kc_table + adjustment

    return round(kc, 3)


if __name__ == "__main__":

    # Example: wheat
    kc_mid = 1.15

    wind_speed = 4.0       # m/s
    rh_min = 40.0          # %
    crop_height = 1.0      # m

    kc = calculate_kc(
        kc_table=kc_mid,
        wind_speed=wind_speed,
        rh_min=rh_min,
        crop_height=crop_height
    )

    print(f"Adjusted Kc: {kc}")