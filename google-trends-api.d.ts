declare module "google-trends-api" {
  type InterestOverTimeOptions = {
    keyword: string | string[];
    startTime?: Date;
    endTime?: Date;
    granularTimeResolution?: boolean;
  };

  const googleTrendsApi: {
    interestOverTime(options: InterestOverTimeOptions): Promise<string>;
  };

  export default googleTrendsApi;
}
