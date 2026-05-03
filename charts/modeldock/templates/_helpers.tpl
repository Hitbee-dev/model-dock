{{- define "modeldock.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "modeldock.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "modeldock.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "modeldock.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
app.kubernetes.io/name: {{ include "modeldock.name" . | quote }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
{{- end -}}

{{- define "modeldock.selectorLabels" -}}
app.kubernetes.io/name: {{ include "modeldock.name" . | quote }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
{{- end -}}

{{- define "modeldock.secretName" -}}
{{- default (printf "%s-secrets" (include "modeldock.fullname" .)) .Values.secrets.existingSecret -}}
{{- end -}}

{{- define "modeldock.requireProductionSecret" -}}
{{- $root := index . 0 -}}
{{- $name := index . 1 -}}
{{- $value := index . 2 -}}
{{- if and $root.Values.global.production (not $root.Values.secrets.existingSecret) (or (empty $value) (contains "replace-with-" $value)) -}}
{{- fail (printf "%s must be set to a non-placeholder value when global.production=true" $name) -}}
{{- end -}}
{{- end -}}
