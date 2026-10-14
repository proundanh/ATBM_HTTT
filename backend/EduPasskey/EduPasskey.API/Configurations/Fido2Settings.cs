namespace EduPasskey.API.Configurations;

public class Fido2Settings
{
    public string RPID { get; set; }
    public string RPName { get; set; }

    public List<string> Origins { get; set; }

    public int TimestampDriftTolerance { get; set; }
}
