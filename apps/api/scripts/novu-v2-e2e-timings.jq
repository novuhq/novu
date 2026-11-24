[inputs | split("\t") | .[0] as $job | .[2] | capture("^(?<t>[^.]+)(?<f>\\.\\d+)Z (?<e>\\[\"(pass|fail)\".*)$")?
 | {$job, ts: ((.t + "Z" | fromdate) + (.f | tonumber)), file: (.e | fromjson[1].file | sub(".*/apps/api/"; ""))}]
| group_by(.job) | map(. as $e | range(1; length) | {file: $e[.].file, s: ($e[.].ts - $e[. - 1].ts)})
| group_by(.file) | map({(.[0].file): (map(.s) | add * 10 | round / 10)}) | add
