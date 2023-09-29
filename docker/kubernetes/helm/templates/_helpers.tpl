{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "novu.imagePullSecrets" -}}
{{- include "common.images.pullSecrets" (dict "images" (list .Values.api.image ) "global" .Values.global) -}}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "novu.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "common.names.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Return true if cert-manager required annotations for TLS signed certificates are set in the Ingress annotations
Ref: https://cert-manager.io/docs/usage/ingress/#supported-annotations
*/}}
{{- define "novu.ingress.certManagerRequest" -}}
{{ if or (hasKey . "cert-manager.io/cluster-issuer") (hasKey . "cert-manager.io/issuer") }}
    {{- true -}}
{{- end -}}
{{- end -}}


{{/*
Compile all warnings into a single message.
*/}}
{{- define "novu.validateValues" -}}
{{- $messages := list -}}
{{- $messages := append $messages (include "novu.validateValues.foo" .) -}}
{{- $messages := append $messages (include "novu.validateValues.bar" .) -}}
{{- $messages := without $messages "" -}}
{{- $message := join "\n" $messages -}}

{{- if $message -}}
{{-   printf "\nVALUES VALIDATION:\n%s" $message -}}
{{- end -}}
{{- end -}}



{{/*
Return the proper api image name
*/}}
{{- define "novu-api.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.api.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper image name (for the init container volume-permissions image)
*/}}
{{- define "novu-api.volumePermissions.image" -}}
{{- include "common.images.image" ( dict "imageRoot" "global" .Values.global ) -}}
{{- end -}}


{{/*
Return the proper worker image name
*/}}
{{- define "novu-worker.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.worker.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper image name (for the init container volume-permissions image)
*/}}
{{- define "novu-worker.volumePermissions.image" -}}
{{- include "common.images.image" ( dict "imageRoot" "global" .Values.global ) -}}
{{- end -}}


{{/*
Return the proper ws image name
*/}}
{{- define "novu-ws.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.ws.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper image name (for the init container volume-permissions image)
*/}}
{{- define "novu-ws.volumePermissions.image" -}}
{{- include "common.images.image" ( dict "imageRoot" "global" .Values.global ) -}}
{{- end -}}

{{/*
Return the proper web image name
*/}}
{{- define "novu-web.image" -}}
{{ include "common.images.image" (dict "imageRoot" .Values.web.image "global" .Values.global) }}
{{- end -}}

{{/*
Return the proper image name (for the init container volume-permissions image)
*/}}
{{- define "novu-web.volumePermissions.image" -}}
{{- include "common.images.image" ( dict "imageRoot" "global" .Values.global ) -}}
{{- end -}}

{{/*
Return Redis(TM) fullname
*/}}
{{- define "novu.redis.fullname" -}}
{{- include "common.names.dependency.fullname" (dict "chartName" "redis" "chartValues" .Values.redis "context" $) -}}
{{- end -}}

{{/*
Create a default fully qualified Redis(TM) name.
*/}}
{{- define "novu.redis.host" -}}
{{- if .Values.redis.enabled -}}
    {{- printf "%s-master" (include "novu.redis.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- else -}}
    {{- print .Values.externalRedis.host -}}
{{- end -}}
{{- end -}}

{{/*
Return Redis(TM) port
*/}}
{{- define "novu.redis.port" -}}
{{- if .Values.redis.enabled -}}
    {{- print .Values.redis.master.service.ports.redis -}}
{{- else -}}
    {{- print .Values.externalRedis.port  -}}
{{- end -}}
{{- end -}}


{{/*
Return if Redis(TM) authentication is enabled
*/}}
{{- define "novu.redis.auth.enabled" -}}
{{- if .Values.redis.enabled -}}
    {{- if .Values.redis.auth.enabled -}}
        {{- true -}}
    {{- end -}}
{{- else if or .Values.externalRedis.password .Values.externalRedis.existingSecret -}}
    {{- true -}}
{{- end -}}
{{- end -}}

{{/*
Return the Redis(TM) Secret Name
*/}}
{{- define "novu.redis.secretName" -}}
{{- if .Values.redis.enabled -}}
    {{- print (include "novu.redis.fullname" .) "-password" -}}
{{- else if .Values.externalRedis.existingSecret -}}
    {{- print .Values.externalRedis.existingSecret -}}
{{- else -}}
    {{- printf "%s-externalredis" (include "common.names.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Retrieve key of the Redis(TM) secret
*/}}
{{- define "novu.redis.passwordKey" -}}
{{- if .Values.redis.enabled -}}
    {{- print "redis-password" -}}
{{- else -}}
    {{- if .Values.externalRedis.existingSecret -}}
        {{- if .Values.externalRedis.existingSecretPasswordKey -}}
            {{- printf "%s" .Values.externalRedis.existingSecretPasswordKey -}}
        {{- else -}}
            {{- print "redis-password" -}}
        {{- end -}}
    {{- else -}}
        {{- print "redis-password" -}}
    {{- end -}}
{{- end -}}
{{- end -}}

{{/*
Return MongoDB fullname
*/}}
{{- define "novu.mongodb.fullname" -}}
{{- include "common.names.dependency.fullname" (dict "chartName" "mongodb" "chartValues" .Values.mongodb "context" $) -}}
{{- end -}}

{{/*
Return mongodb host
*/}}
{{- define "novu.mongodb.host" -}}
{{- if .Values.mongodb.enabled -}}
    {{- include "novu.mongodb.fullname" . -}}
{{- else -}}
    {{- print .Values.externalDatabase.host -}}
{{- end -}}
{{- end -}}

{{/*
Return mongodb port
*/}}
{{- define "novu.mongodb.port" -}}
{{- if .Values.mongodb.enabled -}}
    {{/* We are using the headless service so we need to use the container port */}}
    {{- print .Values.mongodb.service.ports.mongodb -}}
{{- else -}}
    {{- print .Values.externalDatabase.port -}}
{{- end -}}
{{- end -}}

{{/*
Return mongodb username
*/}}
{{- define "novu.mongodb.username" -}}
{{- if .Values.mongodb.enabled -}}
    {{- print (index .Values.mongodb.auth.usernames 0) -}}
{{- else -}}
    {{- print .Values.externalDatabase.username -}}
{{- end -}}
{{- end -}}

{{/*
Return mongodb username
*/}}
{{- define "novu.mongodb.password" -}}
{{- if .Values.mongodb.enabled -}}
    {{- print (index .Values.mongodb.auth.passwords 0) -}}
{{- else -}}
    {{- print .Values.externalDatabase.password -}}
{{- end -}}
{{- end -}}

{{/*
Return mongodb username
*/}}
{{- define "novu.mongodb.database" -}}
{{- if .Values.mongodb.enabled -}}
    {{- print (index .Values.mongodb.auth.databases 0) -}}
{{- else -}}
    {{- print .Values.externalDatabase.database  -}}
{{- end -}}
{{- end -}}


{{/*
Return mongodb secretName
*/}}
{{- define "novu.mongodb.secretName" -}}
{{- if .Values.mongodb.enabled -}}
    {{- printf "%s-url-mongodb" (include "common.names.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- else if .Values.externalDatabase.existingSecret -}}
    {{- printf "%s" .Values.externalDatabase.existingSecret -}}
{{- else -}}
     {{- printf "%s-externaldb" (include "common.names.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}


{{/*
Return s3 fullname
*/}}
{{- define "novu.s3.fullname" -}}
{{- include "common.names.dependency.fullname" (dict "chartName" "localstack" "chartValues" .Values.localstack "context" $) -}}
{{- end -}}


{{/*
Return s3 bucket name
*/}}
{{- define "novu.s3.bucketName" -}}
{{- if .Values.localstack.enabled -}}
    {{- printf "novu-local" -}}
{{- else -}}
    {{- print .Values.externalS3.bucketName  -}}
{{- end -}}
{{- end -}}

{{/*
Return s3 endpoint
*/}}
{{- define "novu.s3.endpoint" -}}
{{- if .Values.localstack.enabled -}}
    {{-  printf "http://%s:%d" (include "novu.s3.fullname" .)  .Values.localstack.service.edgeService.targetPort -}}
{{- else -}}
    {{- print .Values.externalS3.endpoint  -}}
{{- end -}}
{{- end -}}

{{/*
Return s3 secretKey
*/}}
{{- define "novu.s3.region" -}}
{{- if .Values.localstack.enabled -}}
     {{- printf "us-east-1" -}}
{{- else -}}
    {{- print .Values.externalS3.region  -}}
{{- end -}}
{{- end -}}

{{/*
Return the MongoDB Secret Name
*/}}
{{- define "novu.s3.secretName" -}}
{{- if .Values.localstack.enabled }}
    {{- printf "%s" (include "novu.s3.fullname" .) -}}
{{- else if .Values.externalS3.existingSecret -}}
    {{- printf "%s" .Values.externalS3.existingSecret -}}
{{- else -}}
    {{- printf "%s-externals3" (include "common.names.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
