using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace EduPasskey.API.Common;

public static class StepUpHelper
{
    public static string ComputeCanonicalActionHash(string action, JsonElement payload)
    {
        string canonicalString;

        if (action.Equals("UpdateProfile", StringComparison.OrdinalIgnoreCase))
        {
            var email = payload.TryGetProperty("email", out var e) ? e.GetString() ?? "" : "";
            var phone = payload.TryGetProperty("phone", out var p) ? p.GetString() ?? "" : "";
            var account = payload.TryGetProperty("scholarshipAccount", out var a) ? a.GetString() ?? "" : "";

            canonicalString = $"UpdateProfile|{email.Trim().ToLowerInvariant()}|{phone.Trim()}|{account.Trim()}";
        }
        else if (action.Equals("RevokeCredential", StringComparison.OrdinalIgnoreCase))
        {
            var credentialId = payload.TryGetProperty("credentialId", out var c) ? c.GetString() ?? "" : "";
            canonicalString = $"RevokeCredential|{credentialId.Trim()}";
        }
        else
        {
            canonicalString = $"{action}|{payload.GetRawText()}";
        }

        return ComputeSha256(canonicalString);
    }

    public static string ComputeCanonicalUpdateProfileHash(string email, string phone, string scholarshipAccount)
    {
        var canonicalString = $"UpdateProfile|{email.Trim().ToLowerInvariant()}|{phone.Trim()}|{scholarshipAccount.Trim()}";
        return ComputeSha256(canonicalString);
    }

    public static string ComputeCanonicalRevokeCredentialHash(string credentialId)
    {
        var canonicalString = $"RevokeCredential|{credentialId.Trim()}";
        return ComputeSha256(canonicalString);
    }

    private static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
