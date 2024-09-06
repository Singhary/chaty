const upstashRedisRestUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashRedisRestToken = process.env.UPSTASH_REDIS_REST_TOKEN;

type Commands = 'zrange' | 'sismember' | 'get' | 'smember'

export async function fetchRedis(
    Command:Commands,
    ...args:(string|number)[]
){
    const commandUrl = `${upstashRedisRestUrl}/${Command}/${args.join('/')}`;
    
    const response = await fetch(commandUrl,{
        headers:{
            Authorization:`Bearer ${upstashRedisRestToken}`,
        },
        cache:'no-store',
    });

    if(!response.ok){
        throw new Error('Failed to fetch data from Redis');
    }

    const data = await response.json();
    return data.result;
}