from __future__ import annotations


COLORS = {
    "primary": "#4C72B0",
    "secondary": "#DD8452",
    "accent": "#8172B2",
    "success": "#55A868",
    "info": "#64B5CD",
    "warning": "#CCB974",
}

GEN_ORDER = ["Gen Alpha", "Gen Z", "Millennial", "Gen X", "Boomer+"]

TARGETS = [
    "self_reported_happiness",
    "perceived_stress_score",
    "user_engagement_score",
]

TARGET_LABELS = {
    "Self-Reported Happiness": "self_reported_happiness",
    "Perceived Stress Score": "perceived_stress_score",
    "User Engagement Score": "user_engagement_score",
    "Social Media Addiction Risk": "social_media_addiction_risk",
}

PERSONA_DEFINITIONS = {
    0: {"name": "The Healthy Casual", "emoji": "Healthy", "color": COLORS["success"]},
    1: {"name": "The Doom Scroller", "emoji": "Doom", "color": COLORS["secondary"]},
    2: {"name": "The Aspiring Influencer", "emoji": "Influencer", "color": COLORS["warning"]},
    3: {"name": "The Social Butterfly", "emoji": "Social", "color": COLORS["primary"]},
    4: {"name": "The Lurker", "emoji": "Lurker", "color": COLORS["info"]},
    5: {"name": "The Power User", "emoji": "Power", "color": COLORS["accent"]},
}

CATEGORICAL_COLS = [
    "gender",
    "country",
    "urban_rural",
    "income_level",
    "employment_status",
    "education_level",
    "relationship_status",
    "has_children",
    "diet_quality",
    "smoking",
    "alcohol_frequency",
    "content_type_preference",
    "preferred_content_theme",
    "privacy_setting_level",
    "two_factor_auth_enabled",
    "biometric_login_used",
    "subscription_status",
    "uses_premium_features",
]

EXCLUDE_COLS = [
    "user_id",
    "app_name",
    "self_reported_happiness",
    "perceived_stress_score",
    "user_engagement_score",
    "addiction_risk_score",
    "last_login_date",
    "cluster",
    "persona",
    "generation",
    "usage_category",
    "stress_category",
    "account_maturity",
]

CLUSTERING_FEATURES = [
    "daily_active_minutes_instagram",
    "sessions_per_day",
    "posts_created_per_week",
    "reels_watched_per_day",
    "stories_viewed_per_day",
    "comments_written_per_day",
    "dms_sent_per_week",
    "creator_score",
    "consumer_score",
    "social_butterfly_index",
    "wellness_index",
    "perceived_stress_score",
    "self_reported_happiness",
    "followers_count",
    "follower_following_ratio",
    "addiction_risk_score",
    "usage_intensity_score",
]
