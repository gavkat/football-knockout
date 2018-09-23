using System.Collections.Generic;
using System.Configuration;
using System.Threading.Tasks;
using FootballKnockout.Dtos;
using Refit;

namespace FootballKnockout.Clients{
    public interface IFootballDataClient
    {
        [Get("/v2/competitions/{compCode}/matches")]
        Task<MatchesResponse> GetMatches(int compCode, int season);
    }
}