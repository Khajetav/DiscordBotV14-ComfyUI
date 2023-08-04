@echo off
setlocal enabledelayedexpansion
if exist pidfile (
    for /F %%i in (pidfile) do (
        set PID=%%i
        echo PID is !PID!
    )
    if defined PID (
        taskkill /F /PID !PID! /T
    )
)
node index.js > output.log 2>&1