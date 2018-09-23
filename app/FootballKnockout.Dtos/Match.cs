using System;
using System.Collections.Generic;

namespace FootballKnockout.Dtos
{
    public class MatchesResponse {
        public List<Match> Matches { get; set; }
    }

    public class Match {
        public long Id { get; set; }
        public DateTime UtcDate { get; set; }
        public Team HomeTeam { get; set; }
        public Team AwayTeam { get; set; }
        public Score Score { get; set; }

    }

    public class Team {
        public long Id { get; set; }
        public string Name { get; set; }
    }

    public class Score {
        public MatchScore FullTime { get; set; }
    }

    public class MatchScore {
       public int HomeTeam { get; set; }
       public int AwayTeam { get; set; }
    }

}