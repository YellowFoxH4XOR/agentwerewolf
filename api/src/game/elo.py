"""ELO calculation per agent. Creator ELO = win-rate-weighted average across their roster."""

K_FACTOR = 32


def expected_score(rating_a: int, rating_b: int) -> float:
    return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))


def update(rating: int, opponent_rating: int, score: float, k: int = K_FACTOR) -> int:
    return round(rating + k * (score - expected_score(rating, opponent_rating)))
