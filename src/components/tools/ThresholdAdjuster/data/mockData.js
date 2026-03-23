export const generateMockData = (count = 1000) => {
    const data = [];
    const origins = ['Tribunal Case A', 'Tribunal Case B', 'Tribunal Case C', 'Tribunal Case D'];
    const summaries = [
        "Appellant's account of political activities is consistent, but lack of documentary evidence raises doubt about the timeline.",
        "Medical report confirms scarring consistent with torture, but tribunal questions the delay in seeking asylum.",
        "The translation of the interview reveals ambiguities in the key testimony regarding the method of escape.",
        "Country guidance suggests safety in the capital, contradicting appellant's fear of state agents in their home region.",
        "Witness testimony supports the claim of persecution, but the witness's own credibility is challenged by the Home Office.",
        "Appellant claims to be a member of a persecuted religious minority, but failed to answer basic questions about the faith.",
        "The narrative of escape involves a smuggler who cannot be traced, creating a gap in the evidence chain.",
        "Social media evidence provided by the appellant is disputed as potentially fabricated or staged.",
        "Appellant fears persecution due to imputed political opinion based on family history.",
        "The decision hinges on whether the appellant's activities in the UK would attract attention upon return."
    ];

    for (let i = 0; i < count; i++) {
        // Generate a risk score with a distribution that clusters somewhat around 0.4-0.6 to create "doubt"
        // We use a mix of beta-like distributions to make it interesting
        let score;
        const rand = Math.random();
        if (rand < 0.3) {
            score = Math.random() * 0.4; // Clear rejections
        } else if (rand > 0.7) {
            score = 0.6 + Math.random() * 0.4; // Clear acceptances
        } else {
            score = 0.4 + Math.random() * 0.2; // The "Zone of Doubt"
        }

        // Round to 3 decimal places
        score = Math.round(score * 1000) / 1000;

        data.push({
            id: `APPEAL-${2023000 + i}`,
            applicant_name: `Appellant ${String.fromCharCode(65 + (i % 26))}${i}`, // Anonymized (e.g., Appellant A0)
            origin: origins[Math.floor(Math.random() * origins.length)],
            case_summary: summaries[Math.floor(Math.random() * summaries.length)],
            risk_score: score,
        });
    }
    return data;
};
