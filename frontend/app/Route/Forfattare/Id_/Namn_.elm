module Route.Forfattare.Id_.Namn_ exposing (Model, Msg, RouteParams, route, Data, ActionData)

{-|

@docs Model, Msg, RouteParams, route, Data, ActionData

-}

import BackendTask
import BackendTask.Custom
import Book
import FatalError exposing (FatalError)
import Head
import Html
import Html.Attributes
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
    { id : String, namn : String }


route : RouteBuilder.StatelessRoute RouteParams Data ActionData
route =
    RouteBuilder.preRender
        { data = data
        , pages = pages
        , head = head
        }
        |> RouteBuilder.buildNoState { view = view }


type alias Data =
    { author : { name : String, lifeSpan : Maybe String }
    , titles : List Book.Book
    }


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : RouteParams -> BackendTask.BackendTask FatalError Data
data routeParams =
    BackendTask.Custom.run "getTitlesForAuthor"
        (Json.Encode.string routeParams.id)
        (Json.Decode.map2 Data
            (Json.Decode.field
                "author"
                (Json.Decode.map2
                    (\name lifeSpan ->
                        { name = name, lifeSpan = lifeSpan }
                    )
                    (Json.Decode.field "name" Json.Decode.string)
                    (Json.Decode.maybe (Json.Decode.field "life_span" Json.Decode.string))
                )
            )
            (Json.Decode.field "titles" (Json.Decode.list Book.decode))
        )
        |> BackendTask.allowFatal


head : RouteBuilder.App Data ActionData RouteParams -> List Head.Tag
head _ =
    []


view :
    RouteBuilder.App Data ActionData RouteParams
    -> Shared.Model
    -> View.View (PagesMsg.PagesMsg Msg)
view app _ =
    let
        title =
            [ Just app.data.author.name, Book.wrapWithParens app.data.author.lifeSpan ] |> List.filterMap identity |> String.join " "
    in
    { title = title
    , body =
        [ Html.h2 [] [ Html.text title ]
        , Html.section []
            [ Html.div
                [ Html.Attributes.class "book-grid" ]
                (List.map (Book.view { linkToAuthor = False, linkToYear = True, linkToTitle = True }) app.data.titles)
            ]
        ]
    }


pages : BackendTask.BackendTask FatalError.FatalError (List RouteParams)
pages =
    BackendTask.Custom.run "getAuthors"
        Json.Encode.null
        (Json.Decode.list
            (Json.Decode.map2 RouteParams
                (Json.Decode.field "id" Json.Decode.int |> Json.Decode.map String.fromInt)
                (Json.Decode.field "slug" Json.Decode.string)
            )
        )
        |> BackendTask.allowFatal
