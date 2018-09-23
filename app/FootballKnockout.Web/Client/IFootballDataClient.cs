using System.Collections.Generic;
using System.Configuration;
using System.Threading.Tasks;
using FootballKnockout.Dtos;
using Refit;

namespace FootballKnockout.Clients{
    public interface IFootballDataClient
    {
        [Get("/v2/competitions/{compCode}/matches")]
        Task<Matches> GetMatches(string compCode, int season);

        [Get("/v2/competitions/{compCode}/teams")]
        Task<Teams> GetTeams(string compCode, int season);
    }
}