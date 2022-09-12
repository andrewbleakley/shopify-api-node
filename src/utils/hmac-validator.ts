import {ConfigInterface} from '../base-types';
import {createSHA256HMAC} from '../runtime/crypto';
import {HmacReturnFormat} from '../runtime/crypto/types';
import {AuthQuery} from '../auth/oauth/types';
import * as ShopifyErrors from '../error';

import {safeCompare} from './safe-compare';
import ProcessedQuery from './processed-query';

function stringifyQuery(query: AuthQuery): string {
  const processedQuery = new ProcessedQuery();
  Object.keys(query)
    .sort((val1, val2) => val1.localeCompare(val2))
    .forEach((key: string) => processedQuery.put(key, query[key]));

  return processedQuery.stringify(true);
}

export function createGenerateLocalHmac(config: ConfigInterface) {
  return async ({
    code,
    timestamp,
    state,
    shop,
    host,
  }: AuthQuery): Promise<string> => {
    const queryString = stringifyQuery({
      code,
      timestamp,
      state,
      shop,
      ...(host && {host}),
    });

    return createSHA256HMAC(
      config.apiSecretKey,
      queryString,
      HmacReturnFormat.Hex,
    );
  };
}

export function createValidateHmac(config: ConfigInterface) {
  return async (query: AuthQuery): Promise<boolean> => {
    if (!query.hmac) {
      throw new ShopifyErrors.InvalidHmacError(
        'Query does not contain an HMAC value.',
      );
    }
    const {hmac} = query;
    const localHmac = await createGenerateLocalHmac(config)(query);

    return safeCompare(hmac as string, localHmac);
  };
}
