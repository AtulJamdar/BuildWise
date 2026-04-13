import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamMessage, setTeamMessage] = useState("");
  const [teamError, setTeamError] = useState("");

  const token = localStorage.getItem("token");

  const fetchTeams = async () => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:8000/teams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unable to fetch teams");
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Team Fetch Error:", err);
      setTeamError(err.message);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchTeams();
  }, [navigate, token]);

  const createTeam = async () => {
    setTeamMessage("");
    setTeamError("");

    if (!newTeamName.trim()) {
      setTeamError("Enter a team name first.");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create team");
      }

      setNewTeamName("");
      setTeamMessage("Team created successfully.");
      fetchTeams();
    } catch (err) {
      console.error("❌ Team Create Error:", err);
      setTeamError(err.message);
    }
  };

  const inviteMember = async () => {
    setTeamMessage("");
    setTeamError("");

    if (!selectedTeam) {
      setTeamError("Please select a team first.");
      return;
    }

    if (!inviteEmail.trim()) {
      setTeamError("Please enter an email to invite.");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/teams/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          team_id: selectedTeam,
          email: inviteEmail.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Invite failed");
      }

      setInviteEmail("");
      setTeamMessage("User invited successfully.");
      fetchTeams();
    } catch (err) {
      console.error("❌ Invite Error:", err);
      setTeamError(err.message);
    }
  };

  return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900">Teams</h1>
              <p className="mt-2 text-gray-600">Manage your team workspace and invitations.</p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
            >
              Dashboard
            </button>
          </div>

          {(teamMessage || teamError) && (
            <div className={`mb-6 rounded-3xl px-5 py-4 text-sm font-medium ${teamMessage ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {teamMessage || teamError}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Create a Team</h2>
              <p className="mt-2 text-gray-600">Spin up a new collaboration workspace.</p>

              <input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name"
                className="mt-6 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
              />
              <button
                onClick={createTeam}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-bold text-white hover:bg-gray-900"
              >
                Create Team
              </button>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">Invite Member</h2>
              <p className="mt-2 text-gray-600">Invite teammates into your selected team.</p>

              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="mt-6 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
              >
                <option value="">Select a team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>

              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="User email"
                className="mt-4 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
              />
              <button
                onClick={inviteMember}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Send Invite
              </button>
            </div>
          </div>

          <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Your Teams</h2>
            <div className="mt-4 grid gap-4">
              {teams.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-6 text-gray-500">No teams created yet.</div>
              ) : (
                teams.map((team) => (
                  <div key={team.id} className="rounded-3xl border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900">{team.name}</h3>
                    <p className="text-sm text-gray-500 mt-2">Role: {team.role || "member"}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
  );
}
