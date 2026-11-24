[inputs | split("\t") | .[0] as $job | .[2] | capture("^(?<t>[^.]+)(?<f>\\.\\d+)Z (?<e>\\[\"(pass|fail)\".*)$")?
 | (.e | fromjson[1]) as $test
 | {$job, ts: ((.t + "Z" | fromdate) + (.f | tonumber)), file: ($test.file | sub(".*/apps/api/"; "")), first: (($test.duration // 0) / 1000)}]
| group_by(.job) | map(. as $e | range(length) | {file: $e[.].file, s: (if . == 0 then $e[0].first else $e[.].ts - $e[. - 1].ts end)})
| group_by(.file) | map({(.[0].file): (map(.s) | add * 10 | round / 10)}) | add
