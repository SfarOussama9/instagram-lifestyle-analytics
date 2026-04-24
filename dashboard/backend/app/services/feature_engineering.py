from __future__ import annotations

import numpy as np
import pandas as pd


def assign_generation(age: float) -> str:
    if age < 12:
        return "Gen Alpha"
    if age < 28:
        return "Gen Z"
    if age < 44:
        return "Millennial"
    if age < 60:
        return "Gen X"
    return "Boomer+"


def engineer_features(dataframe: pd.DataFrame) -> pd.DataFrame:
    df_eng = dataframe.copy()

    df_eng["likes_to_followers_ratio"] = (
        df_eng["likes_given_per_day"] / (df_eng["followers_count"] + 1)
    ).clip(0, 10)

    df_eng["comments_to_posts_ratio"] = (
        df_eng["comments_written_per_day"] / (df_eng["posts_created_per_week"] / 7 + 0.1)
    ).clip(0, 50)

    df_eng["follower_following_ratio"] = (
        df_eng["followers_count"] / (df_eng["following_count"] + 1)
    ).clip(0, 100)

    df_eng["dm_reciprocity"] = (
        df_eng["dms_received_per_week"] / (df_eng["dms_sent_per_week"] + 1)
    ).clip(0, 10)

    df_eng["ad_click_rate"] = (
        df_eng["ads_clicked_per_day"] / (df_eng["ads_viewed_per_day"] + 1)
    ).clip(0, 1)

    df_eng["total_daily_interactions"] = (
        df_eng["likes_given_per_day"]
        + df_eng["comments_written_per_day"]
        + df_eng["stories_viewed_per_day"]
        + df_eng["reels_watched_per_day"]
    )

    df_eng["usage_intensity_score"] = (
        df_eng["daily_active_minutes_instagram"] * df_eng["sessions_per_day"]
    ) / 100

    df_eng["passive_active_ratio"] = (
        (df_eng["reels_watched_per_day"] + df_eng["stories_viewed_per_day"])
        / (df_eng["posts_created_per_week"] + df_eng["comments_written_per_day"] + 1)
    ).clip(0, 100)

    df_eng["session_depth"] = (
        df_eng["daily_active_minutes_instagram"] / (df_eng["sessions_per_day"] + 0.1)
    ).clip(0, 120)

    df_eng["bmi_score"] = (100 - np.abs(df_eng["body_mass_index"] - 22) * 3).clip(0, 100)
    df_eng["cardio_score"] = (
        100
        - np.abs(df_eng["blood_pressure_systolic"] - 120) * 0.5
        - np.abs(df_eng["blood_pressure_diastolic"] - 80) * 0.5
    ).clip(0, 100)
    df_eng["activity_score"] = (
        (df_eng["daily_steps_count"] / 100) + (df_eng["exercise_hours_per_week"] * 5)
    ).clip(0, 100)
    df_eng["wellness_index"] = (
        df_eng["bmi_score"] * 0.25
        + df_eng["cardio_score"] * 0.25
        + df_eng["activity_score"] * 0.25
        + (df_eng["sleep_hours_per_night"] / 8 * 25)
    ).clip(0, 100)

    df_eng["creator_score"] = (
        df_eng["posts_created_per_week"] * 2 + df_eng["comments_written_per_day"] * 0.5
    ).clip(0, 50)
    df_eng["consumer_score"] = (
        df_eng["reels_watched_per_day"] * 0.3
        + df_eng["stories_viewed_per_day"] * 0.3
        + df_eng["time_on_explore_per_day"] * 0.4
    ).clip(0, 100)
    df_eng["social_butterfly_index"] = (
        df_eng["dms_sent_per_week"]
        + df_eng["dms_received_per_week"]
        + df_eng["comments_written_per_day"] * 7
        + df_eng["social_events_per_month"] * 2
    ).clip(0, 200)
    df_eng["addiction_risk_score"] = (
        (df_eng["daily_active_minutes_instagram"] / 60) * 20
        + df_eng["sessions_per_day"] * 3
        + (df_eng["notification_response_rate"] * 20)
        + (40 - df_eng["perceived_stress_score"]) * (-0.5)
    ).clip(0, 100)

    current_year = 2025
    df_eng["account_age_years"] = current_year - df_eng["account_creation_year"]
    df_eng["last_login_date"] = pd.to_datetime(df_eng["last_login_date"], errors="coerce")
    df_eng["days_since_last_login"] = (
        pd.to_datetime("2025-12-31") - df_eng["last_login_date"]
    ).dt.days.fillna(0)
    df_eng["account_maturity"] = pd.cut(
        df_eng["account_age_years"],
        bins=[-1, 1, 3, 5, 10, 20],
        labels=["New (<1y)", "Growing (1-3y)", "Established (3-5y)", "Veteran (5-10y)", "Pioneer (10y+)"],
    )

    df_eng["work_life_digital_balance"] = (
        df_eng["weekly_work_hours"] / (df_eng["daily_active_minutes_instagram"] * 7 / 60 + 1)
    ).clip(0, 50)
    df_eng["offline_online_social_ratio"] = (
        df_eng["social_events_per_month"] / (df_eng["sessions_per_day"] * 30 / 10 + 1)
    ).clip(0, 10)
    df_eng["hobby_screen_balance"] = (
        df_eng["hobbies_count"] * 10 / (df_eng["daily_active_minutes_instagram"] / 60 + 1)
    ).clip(0, 50)

    return df_eng
