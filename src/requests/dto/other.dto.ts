import moment = require("moment-timezone");
import { type, hostname, release, totalmem, cpus } from "os";
import Utils from "src/util/Utils";
import momentDurationFormatSetup = require("moment-duration-format");

momentDurationFormatSetup(moment);

export class OtherStatusDto {
    timestamp: number;
    processInfo: {
        uptime: string;
        pid: number;
        title: string;
    };
    apiInfo: {
        apiName: string;
        apiVersion: string;
        guildId: string;
        gitVersionInfo: {
            branch: string;
            commitId: string;
        };
    };
    systemInfo: {
        platform: string;
        type: string;
        hostname: string;
        release: string;
        memory: number;
        cores: number;
    };

    static fromJson(
        json: Record<string, string>,
        guildId: string,
    ): OtherStatusDto {
        const uptime = moment
            .duration(process.uptime(), "seconds")
            .format(
                "Y [years] M [months] D [days] h [hours] m [minutes] s [seconds]",
            );

        return {
            timestamp: Date.now(),
            processInfo: {
                uptime: uptime,
                pid: process.pid,
                title: process.title,
            },
            apiInfo: {
                apiName: json.name,
                apiVersion: json.version,
                guildId: guildId,
                gitVersionInfo: Utils.getCommitInfo(),
            },
            systemInfo: {
                platform: process.platform,
                type: type(),
                hostname: hostname(),
                release: release(),
                memory: totalmem(),
                cores: cpus().length,
            },
        };
    }
}

export class OtherStatsDto {
    comps: {
        count: number;
    };
    categories: {
        count: number;
    };
    raids: {
        count: number;
        countPublished: number;
    };
    members: {
        count: number;
    };
    trainingRequests: {
        count: number;
        countActive: number;
    };
}
