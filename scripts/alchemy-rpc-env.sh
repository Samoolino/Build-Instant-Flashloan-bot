#!/usr/bin/env bash
set -euo pipefail

# Read-only RPC bootstrap for the seven-network verification matrix.
# Safe to source or run with bash. Only known RPC variables are loaded from .env.
# The API key is never printed.

load_dotenv_value() {
  local key="$1" value
  [[ -f .env ]] || return 0
  value="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" .env | tail -n 1 | sed -E "s/^[[:space:]]*(export[[:space:]]+)?${key}=//" | sed -E 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  [[ -n "$value" ]] && printf '%s' "$value"
}

is_placeholder() {
  local value="$1"
  [[ -z "$value" ]] && return 0
  [[ "$value" == *'\\${'* ]] && return 0
  [[ "$value" == *'YOUR_'* ]] && return 0
  [[ "$value" == *'PASTE_YOUR_'* ]] && return 0
  [[ "$value" == *'replace_with_'* ]] && return 0
  [[ "$value" == *'$ALCHEMY_API_KEY'* ]] && return 0
  return 1
}

if [[ -z "${ALCHEMY_API_KEY:-}" ]]; then
  _dotenv_key="$(load_dotenv_value ALCHEMY_API_KEY || true)"
  [[ -n "$_dotenv_key" ]] && export ALCHEMY_API_KEY="$_dotenv_key"
  unset _dotenv_key
fi

for _rpc_var in ETH_RPC_URL BSC_RPC_URL BASE_RPC_URL ARBITRUM_RPC_URL AVAX_RPC_URL CRONOS_RPC_URL SONIC_RPC_URL; do
  if [[ -z "${!_rpc_var:-}" ]]; then
    _dotenv_rpc="$(load_dotenv_value "$_rpc_var" || true)"
    [[ -n "$_dotenv_rpc" ]] && export "$_rpc_var=$_dotenv_rpc"
    unset _dotenv_rpc
  fi
done

if [[ -z "${ALCHEMY_API_KEY:-}" ]]; then
  missing=()
  for _rpc_var in ETH_RPC_URL BSC_RPC_URL BASE_RPC_URL ARBITRUM_RPC_URL AVAX_RPC_URL CRONOS_RPC_URL SONIC_RPC_URL; do
    [[ -n "${!_rpc_var:-}" ]] || missing+=("$_rpc_var")
  done
  if (("${#missing[@]}")); then
    echo "ERROR: No RPC credentials found." >&2
    echo "Set ALCHEMY_API_KEY in .env or the shell, or set each explicit *_RPC_URL." >&2
    echo "Missing: ${missing[*]}" >&2
    return 1 2>/dev/null || exit 1
  fi
else
  case "${ALCHEMY_API_KEY}" in
    ""|YOUR_CURRENT_ALCHEMY_KEY|YOUR_REAL_ALCHEMY_KEY|PASTE_YOUR_ACTUAL_ALCHEMY_API_KEY_HERE|PASTE_YOUR_ACTUAL_ALCHEMY_API_KEY)
      echo "ERROR: ALCHEMY_API_KEY is still a placeholder." >&2
      return 1 2>/dev/null || exit 1
      ;;
  esac

  : "${ETH_RPC_URL:=https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}}"
  : "${BSC_RPC_URL:=https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}}"
  : "${BASE_RPC_URL:=https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}}"
  : "${ARBITRUM_RPC_URL:=https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}}"
  : "${AVAX_RPC_URL:=https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}}"
  : "${CRONOS_RPC_URL:=https://cronos-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}}"
  : "${SONIC_RPC_URL:=https://sonic-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}}"
  for _rpc_var in ETH_RPC_URL BSC_RPC_URL BASE_RPC_URL ARBITRUM_RPC_URL AVAX_RPC_URL CRONOS_RPC_URL SONIC_RPC_URL; do
    _rpc_value="${!_rpc_var:-}"
    if is_placeholder "$_rpc_value"; then
      case "$_rpc_var" in
        ETH_RPC_URL) export "$_rpc_var=https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}" ;;
        BSC_RPC_URL) export "$_rpc_var=https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}" ;;
        BASE_RPC_URL) export "$_rpc_var=https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}" ;;
        ARBITRUM_RPC_URL) export "$_rpc_var=https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}" ;;
        AVAX_RPC_URL) export "$_rpc_var=https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}" ;;
        CRONOS_RPC_URL) export "$_rpc_var=https://cronos-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}" ;;
        SONIC_RPC_URL) export "$_rpc_var=https://sonic-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}" ;;
      esac
    fi
  done
  export ETH_RPC_URL BSC_RPC_URL BASE_RPC_URL ARBITRUM_RPC_URL AVAX_RPC_URL CRONOS_RPC_URL SONIC_RPC_URL
fi

for _rpc_var in ETH_RPC_URL BSC_RPC_URL BASE_RPC_URL ARBITRUM_RPC_URL AVAX_RPC_URL CRONOS_RPC_URL SONIC_RPC_URL; do
  _rpc_value="${!_rpc_var:-}"
  if [[ -z "$_rpc_value" || "$_rpc_value" == *'\${'* || "$_rpc_value" == *'YOUR_'* || "$_rpc_value" == *'PASTE_YOUR_'* ]]; then
    echo "ERROR: $_rpc_var is unset or still a placeholder/unevaluated value." >&2
    return 1 2>/dev/null || exit 1
  fi
done

unset _rpc_var _rpc_value
printf '%s\n' "Alchemy RPC environment prepared for 7 EVM networks (credentials not printed)."
