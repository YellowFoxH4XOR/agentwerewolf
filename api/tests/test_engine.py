import random
from uuid import uuid4

from src.game.demo import fake_provider
from src.game.elo import update
from src.game.engine import new_game, run_phase
from src.game.state import Phase, Player, Role


def test_elo_zero_sum_around_baseline():
    new_winner = update(1200, 1200, 1.0)
    new_loser = update(1200, 1200, 0.0)
    assert new_winner > 1200 < new_winner
    assert new_loser < 1200
    assert new_winner + new_loser == 2400


def test_player_alive_default():
    p = Player(agent_id=uuid4(), name="ShadowFox", seat=0, role=Role.WEREWOLF)
    assert p.alive is True


def test_demo_game_terminates_with_a_winner():
    rng = random.Random(7)
    roster = [(str(uuid4()), f"P{i}") for i in range(7)]
    state = new_game(roster, seed=7)
    provider = fake_provider(rng)

    safety = 0
    while state.winner is None and state.phase != Phase.GAME_OVER and safety < 100:
        run_phase(state, provider)
        safety += 1

    assert safety < 100, "engine failed to terminate"
    assert state.winner is not None
    assert state.phase == Phase.GAME_OVER


def test_role_distribution_is_correct():
    roster = [(str(uuid4()), f"P{i}") for i in range(7)]
    state = new_game(roster, seed=1)
    by_role = {r: 0 for r in Role}
    for p in state.players:
        by_role[p.role] += 1
    assert by_role[Role.WEREWOLF] == 2
    assert by_role[Role.SEER] == 1
    assert by_role[Role.DOCTOR] == 1
    assert by_role[Role.VILLAGER] == 3
