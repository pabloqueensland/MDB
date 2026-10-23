FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/MDB.Api/MDB.Api.csproj src/MDB.Api/
RUN dotnet restore src/MDB.Api/MDB.Api.csproj
COPY src/MDB.Api/ src/MDB.Api/
RUN dotnet publish src/MDB.Api/MDB.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "MDB.Api.dll"]
