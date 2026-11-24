using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TutorPlatform.DTOs;
using TutorPlatform.Services;

namespace TutorPlatform.Controllers;

[ApiController]
[Route("api/study-groups")]
public class StudyGroupsController : ControllerBase
{
    private readonly StudyGroupService _service;
    private readonly GroupChatService _groupChat;
    private readonly GroupFeedService _feed;

    public StudyGroupsController(StudyGroupService service, GroupChatService groupChat, GroupFeedService feed)
    {
        _service = service;
        _groupChat = groupChat;
        _feed = feed;
    }

    private int? UserId
    {
        get
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("nameid")
                ?? User.FindFirstValue("sub");
            return int.TryParse(raw, out var id) ? id : null;
        }
    }

    [HttpGet("feed")]
    public async Task<IActionResult> Feed([FromQuery] string? keyword, CancellationToken cancellationToken)
    {
        var items = await _feed.ListAsync(UserId, keyword, cancellationToken);
        return Ok(new { totalCount = items.Count, items });
    }

    [Authorize]
    [HttpGet("feed/home")]
    public async Task<IActionResult> HomeFeed(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var items = await _feed.HomeAsync(id, cancellationToken);
        return Ok(new { totalCount = items.Count, items });
    }

    [Authorize]
    [HttpPost("feed")]
    public async Task<IActionResult> CreateFeed([FromBody] CreateStudyGroupDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _feed.CreateAsync(id, dto.Title, dto.Description, dto.SubjectId, cancellationToken);
        return result.Success
            ? StatusCode(result.Status, new { message = result.Message, groupId = result.GroupId })
            : StatusCode(result.Status, new { message = result.Message });
    }

    [HttpGet("{id:int}/feed")]
    public async Task<IActionResult> FeedPage(int id, CancellationToken cancellationToken)
    {
        var page = await _feed.GetPageAsync(id, UserId, cancellationToken);
        return page == null ? NotFound(new { message = "Không tìm thấy nhóm." }) : Ok(page);
    }

    [Authorize]
    [HttpPost("{id:int}/feed/join")]
    public async Task<IActionResult> FeedJoin(int id, [FromBody] JoinStudyGroupDto? dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _feed.RequestJoinAsync(userId, id, dto?.Message, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/feed/requests/{applicantId:int}")]
    public async Task<IActionResult> FeedModerate(int id, int applicantId, [FromBody] RespondJoinRequestDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _feed.ModerateAsync(userId, id, applicantId, dto.Accept, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/feed/posts")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> FeedPost(int id, [FromForm] string? body, [FromForm] List<IFormFile>? files, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _feed.CreatePostAsync(userId, id, body, files, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/feed/posts/{postId:int}/review")]
    public async Task<IActionResult> ReviewPost(int id, int postId, [FromBody] RespondJoinRequestDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _feed.ReviewPostAsync(userId, id, postId, dto.Accept, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/feed/posts/{postId:int}/comments")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> FeedComment(int id, int postId, [FromForm] string? body, [FromForm] int? parentCommentId, [FromForm] List<IFormFile>? files, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _feed.CommentAsync(userId, id, postId, parentCommentId, body, files, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/feed/posts/{postId:int}/report")]
    public async Task<IActionResult> ReportPost(int id, int postId, [FromBody] GroupReportDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _feed.ReportAsync(userId, id, "GroupPost", postId, dto.Reason, dto.Description, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/feed/comments/{commentId:int}/report")]
    public async Task<IActionResult> ReportComment(int id, int commentId, [FromBody] GroupReportDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _feed.ReportAsync(userId, id, "GroupComment", commentId, dto.Reason, dto.Description, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] StudyGroupSearchRequest request, CancellationToken cancellationToken)
    {
        var items = await _service.SearchAsync(request, cancellationToken);
        return Ok(new { totalCount = items.Count, items });
    }

    [Authorize]
    [HttpGet("bids/board")]
    public async Task<IActionResult> BidBoard(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _service.ListBidBoardAsync(id, cancellationToken);
        return result.Success
            ? Ok(new { totalCount = result.Items.Count, items = result.Items })
            : StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpGet("bids/mine")]
    public async Task<IActionResult> MyBids(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        return Ok(await _service.ListMyBidsAsync(id, cancellationToken));
    }

    [Authorize]
    [HttpGet("my-desk")]
    public async Task<IActionResult> MyDesk(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var items = await _service.ListMyDeskAsync(id, cancellationToken);
        return Ok(new { totalCount = items.Count, items });
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        return Ok(await _groupChat.ListMineAsync(id, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetAsync(id, UserId, cancellationToken);
        return item == null ? NotFound(new { message = "Không tìm thấy nhóm." }) : Ok(item);
    }

    [Authorize]
    [HttpGet("{id:int}/messages")]
    public async Task<IActionResult> Messages(int id, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        try
        {
            return Ok(await _groupChat.ListMessagesAsync(userId, id, cancellationToken));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [Authorize]
    [HttpPost("{id:int}/messages")]
    public async Task<IActionResult> Send(int id, [FromBody] SendGroupMessageDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        try
        {
            var msg = await _groupChat.SendAsync(userId, id, dto.Content, null, cancellationToken);
            return Ok(msg);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("{id:int}/messages/attachment")]
    [ApiExplorerSettings(IgnoreApi = true)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> SendAttachment(
        int id,
        [FromForm] string? content,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        try
        {
            var msg = await _groupChat.SendAsync(userId, id, content, file, cancellationToken);
            return Ok(msg);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStudyGroupDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int id) return Unauthorized();
        var result = await _service.CreateAsync(id, dto, cancellationToken);
        return result.Success
            ? StatusCode(result.Status, new { message = result.Message, group = result.Data })
            : StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/join")]
    public async Task<IActionResult> Join(int id, [FromBody] JoinStudyGroupDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _service.JoinAsync(userId, id, dto, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/join-requests/{applicantId:int}/respond")]
    public async Task<IActionResult> RespondJoin(int id, int applicantId, [FromBody] RespondJoinRequestDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _service.RespondToJoinRequestAsync(userId, id, applicantId, dto.Accept, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/bids")]
    public async Task<IActionResult> PlaceBid(int id, [FromBody] PlaceStudyGroupBidDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _service.PlaceBidAsync(userId, id, dto, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/bids/withdraw")]
    public async Task<IActionResult> WithdrawBid(int id, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _service.WithdrawBidAsync(userId, id, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/bids/{bidId:int}/vote")]
    public async Task<IActionResult> VoteBid(int id, int bidId, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _service.VoteBidAsync(userId, id, bidId, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/bids/{bidId:int}/select")]
    public async Task<IActionResult> SelectBid(int id, int bidId, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _service.SelectBidAsync(userId, id, bidId, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }

    [Authorize]
    [HttpPost("{id:int}/invite-tutor")]
    public async Task<IActionResult> Invite(int id, [FromBody] InviteTutorDto dto, CancellationToken cancellationToken)
    {
        if (UserId is not int userId) return Unauthorized();
        var result = await _service.InviteTutorAsync(userId, id, dto, cancellationToken);
        return StatusCode(result.Status, new { message = result.Message });
    }
}
