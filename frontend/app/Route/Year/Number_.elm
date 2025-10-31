module Route.Year.Number_ exposing (Model, Msg, RouteParams, route, Data, ActionData)

{-|

@docs Model, Msg, RouteParams, route, Data, ActionData

-}

import BackendTask
import BackendTask.Custom
import Book
import BookList
import FatalError exposing (FatalError)
import Head
import Json.Decode
import Json.Encode
import PagesMsg
import RouteBuilder
import Shared
import View


type alias Model =
    {}


type alias Msg =
    ()


type alias RouteParams =
    { number : String }


route : RouteBuilder.StatelessRoute RouteParams Data ActionData
route =
    RouteBuilder.preRender
        { data = data
        , pages = pages
        , head = head
        }
        |> RouteBuilder.buildNoState { view = view }


type alias Data =
    { ratedBooks : List Book.Book, unratedBooks : List Book.Book }


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : RouteParams -> BackendTask.BackendTask FatalError Data
data routeParams =
    BackendTask.Custom.run "getTitlesForYear"
        (Json.Encode.string routeParams.number)
        (Json.Decode.map2 Data
            (Json.Decode.field "ratedTitles" (Json.Decode.list Book.decode))
            (Json.Decode.field "unratedTitles" (Json.Decode.list Book.decode))
        )
        |> BackendTask.allowFatal


head : RouteBuilder.App Data ActionData RouteParams -> List Head.Tag
head app =
    []


view :
    RouteBuilder.App Data ActionData RouteParams
    -> Shared.Model
    -> View.View (PagesMsg.PagesMsg ())
view app shared =
    { title = "Böcker för år " ++ app.routeParams.number
    , body =
        BookList.view { linkToYear = False, linkToAuthor = True } app.data.ratedBooks app.data.unratedBooks
    }


pages : BackendTask.BackendTask FatalError.FatalError (List RouteParams)
pages =
    -- These are all years we currently have titles for
    List.range 1850 2024
        |> List.map (\year -> { number = String.fromInt year })
        |> BackendTask.succeed
