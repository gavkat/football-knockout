using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using FootballKnockout.Clients;
using FootballKnockout.Dtos;

namespace FootballKnockout.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FootballDataController : ControllerBase
    {
        private readonly IFootballDataClient _footballDataClient;

        public FootballDataController(IFootballDataClient footballDataClient) {
            _footballDataClient = footballDataClient;
        }

        // GET api/footballData/matches
        [HttpGet("matches")]
        public async Task<ActionResult<Matches>> GetMatches()
        {
            return await _footballDataClient.GetMatches("PL", 2017);
        }

        // GET api/footballData/teams
        [HttpGet("teams")]
        public async Task<ActionResult<Teams>> GetTeams()
        {
            return await _footballDataClient.GetTeams("PL", 2017);
        }
    }
}
